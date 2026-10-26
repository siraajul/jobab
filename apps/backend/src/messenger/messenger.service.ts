import { BadRequestException, Injectable } from '@nestjs/common';
import { Platform, Prisma, type Message } from '@prisma/client';
import { UnrecoverableError } from 'bullmq';
import { EnvService } from '../config/env.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Meta Send API client (spec §7). POSTs the agent's reply to
 *   https://graph.facebook.com/{VERSION}/me/messages
 * using the page access token stored on `pages.access_token` (AES-GCM at rest).
 *
 * The **24-hour standard messaging window** is enforced here — outside it,
 * sends throw `OutOfMessagingWindowError`. Meta deprecated the
 * `POST_PURCHASE_UPDATE` / `CONFIRMED_EVENT_UPDATE` / `ACCOUNT_UPDATE` tags
 * (Feb 9, 2026 globally), and the Utility-Messages replacement isn't
 * available in Bangladesh — so there is no in-app fallback. Out-of-window
 * notifications must go via the WhatsApp Cloud API + approved templates.
 *
 * Set MESSENGER_DRY_RUN=true to skip the Graph call (for local testing with
 * fake PSIDs). The outgoing message is still persisted so the inbox UI shows
 * what the AI would have said.
 */
const DEV_TOKEN_SENTINEL = 'dev-token-not-used-in-fake-mode';

/** Per-platform "customer-service window" length. */
const WINDOW_MS_BY_PLATFORM: Record<Platform, number> = {
  facebook: 24 * 60 * 60 * 1000,
  instagram: 24 * 60 * 60 * 1000,
  // WhatsApp's free-form window is also 24h customer-initiated; outside it,
  // only pre-approved templates are billable-sendable.
  whatsapp: 24 * 60 * 60 * 1000,
};

export interface MessagingWindowStatus {
  /** True when the merchant/agent can send free-form text right now. */
  canSend: boolean;
  /** Platform of the page hosting this conversation. */
  platform: Platform;
  /** Window length in milliseconds (informational). */
  windowMs: number;
  /** When the customer last sent us a message, or null if they never did. */
  lastInboundAt: string | null;
  /** When the window closes (or already closed). */
  windowClosesAt: string | null;
  /** Human-readable reason when canSend=false. */
  reason: string | null;
}

/** Thrown by sendText when the 24-hour customer-service window is closed. */
export class OutOfMessagingWindowError extends BadRequestException {
  constructor(public readonly windowStatus: MessagingWindowStatus) {
    super({
      error: 'OUT_OF_MESSAGING_WINDOW',
      message: windowStatus.reason ?? 'Cannot send: outside the 24-hour customer-service window.',
      windowClosesAt: windowStatus.windowClosesAt,
      platform: windowStatus.platform,
    });
  }
}

@Injectable()
export class MessengerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Computes the messaging-window state for a conversation. Pure (no Graph
   * call), safe to expose to the dashboard so it can grey the composer out.
   */
  async getMessagingWindow(conversationId: string): Promise<MessagingWindowStatus> {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { page: true },
    });
    const platform = conv.page.platform;
    const windowMs = WINDOW_MS_BY_PLATFORM[platform];
    const lastIn = conv.lastCustomerMessageAt?.getTime() ?? null;

    if (lastIn === null) {
      return {
        canSend: false,
        platform,
        windowMs,
        lastInboundAt: null,
        windowClosesAt: null,
        reason:
          'Customer has not messaged this page yet — Meta forbids businesses initiating new threads.',
      };
    }

    const closesAt = lastIn + windowMs;
    const canSend = Date.now() < closesAt;
    return {
      canSend,
      platform,
      windowMs,
      lastInboundAt: new Date(lastIn).toISOString(),
      windowClosesAt: new Date(closesAt).toISOString(),
      reason: canSend
        ? null
        : `Outside the ${windowMs / 3_600_000}h customer-service window. ` +
          (platform === 'whatsapp'
            ? 'Send a pre-approved WhatsApp template instead.'
            : 'The customer must message you first to reopen the window.'),
    };
  }

  async sendText(
    conversationId: string,
    text: string,
    attachments?: Record<string, unknown>,
    options: {
      sender?: 'agent' | 'human';
      replyToMessageId?: string;
      automationVersion?: number;
    } = {},
  ): Promise<Message | null> {
    const initialWindow = await this.getMessagingWindow(conversationId);
    if (!initialWindow.canSend) throw new OutOfMessagingWindowError(initialWindow);
    const data = {
      conversationId,
      direction: 'out' as const,
      sender: options.sender ?? 'agent',
      content: text,
      attachments: attachments as Prisma.InputJsonValue | undefined,
      replyToMessageId: options.replyToMessageId,
      deliveryStatus: 'pending',
    };
    let outgoing: Message;
    if (options.replyToMessageId) {
      // Prisma's empty-update upsert can issue a read followed by an insert.
      // ON CONFLICT DO NOTHING makes concurrent duplicate jobs converge on one row.
      await this.prisma.message.createMany({ data: [data], skipDuplicates: true });
      outgoing = await this.prisma.message.findUniqueOrThrow({
        where: { replyToMessageId: options.replyToMessageId },
      });
    } else {
      outgoing = await this.prisma.message.create({ data });
    }
    const send = () =>
      this.prisma.$transaction(
        async (tx) => {
          // Takeover updates the same row. Once takeover returns, an older generation
          // cannot begin a new send. An HTTP request already accepted cannot be recalled.
          // Do not occupy the connection pool waiting behind another sender's
          // provider request. Release this transaction and retry outside the pool.
          const locked = await tx.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM conversations WHERE id = ${conversationId} FOR UPDATE SKIP LOCKED
        `;
          if (locked.length === 0) return { busy: true as const };
          const conv = await tx.conversation.findUniqueOrThrow({
            where: { id: conversationId },
            include: { page: true },
          });
          if (
            options.automationVersion !== undefined &&
            (conv.status !== 'bot' || conv.automationVersion !== options.automationVersion)
          ) {
            await tx.message.updateMany({
              where: { id: outgoing.id, deliveryStatus: 'pending' },
              data: { deliveryStatus: 'cancelled' },
            });
            return { message: null };
          }
          const window = await this.getMessagingWindow(conversationId);
          if (!window.canSend) throw new OutOfMessagingWindowError(window);
          const message = await tx.message.findUniqueOrThrow({ where: { id: outgoing.id } });
          if (message.deliveryStatus === 'cancelled') return { message: null };
          if (message.deliveryStatus === 'sent' || message.deliveryStatus === 'dry_run')
            return { message };
          if (['sending', 'unknown'].includes(message.deliveryStatus)) {
            return {
              message,
              error: new UnrecoverableError('Delivery outcome unknown; reconcile before retrying'),
            };
          }
          const update = (
            deliveryStatus: string,
            deliveryError: string | null = null,
            externalDeliveryId?: string,
          ) =>
            tx.message.update({
              where: { id: message.id },
              data: { deliveryStatus, deliveryError, externalDeliveryId },
            });
          if (this.env.get('MESSENGER_DRY_RUN')) return { message: await update('dry_run') };
          let pageToken: string;
          try {
            if (!conv.page.accessToken || conv.page.accessToken === DEV_TOKEN_SENTINEL)
              throw new Error('missing token');
            pageToken = this.encryption.decrypt(conv.page.accessToken);
          } catch {
            await tx.page.update({ where: { id: conv.pageId }, data: { status: 'disconnected' } });
            return {
              message: await update('failed', 'PAGE_RECONNECT_REQUIRED'),
              error: new UnrecoverableError('Page reconnection required'),
            };
          }
          const version = this.env.get('META_GRAPH_VERSION');
          const endpoint = conv.page.platform === 'facebook' ? 'me' : conv.page.externalPageId;
          const body =
            conv.page.platform === 'whatsapp'
              ? {
                  messaging_product: 'whatsapp',
                  to: conv.externalUserId,
                  type: 'text',
                  text: { body: message.content },
                }
              : {
                  recipient: { id: conv.externalUserId },
                  message: { text: message.content },
                  messaging_type: 'RESPONSE',
                };
          await this.prisma.message.update({
            where: { id: message.id },
            data: { deliveryStatus: 'sending' },
          });
          try {
            const response = await fetch(
              `https://graph.facebook.com/${version}/${endpoint}/messages`,
              {
                method: 'POST',
                signal: AbortSignal.timeout(this.env.get('PROVIDER_TIMEOUT_MS')),
                headers: {
                  authorization: `Bearer ${pageToken}`,
                  'content-type': 'application/json',
                },
                body: JSON.stringify(body),
              },
            );
            if (!response.ok) {
              const failure = (await response.json().catch(() => ({}))) as {
                error?: { code?: number };
              };
              if (
                response.status === 401 ||
                response.status === 403 ||
                failure.error?.code === 190
              ) {
                await tx.page.update({
                  where: { id: conv.pageId },
                  data: { status: 'disconnected' },
                });
              }
              // Never automatically repeat an ambiguous provider failure.
              const retryable = response.status === 429;
              return {
                message: await update(
                  retryable ? 'failed' : response.status >= 500 ? 'unknown' : 'failed',
                  `META_HTTP_${response.status}`,
                ),
                error: retryable
                  ? new Error('Meta rate limited; retry later')
                  : new UnrecoverableError(
                      `Meta send failed (${response.status}); review delivery`,
                    ),
              };
            }
            const payload = (await response.json()) as {
              message_id?: string;
              messages?: Array<{ id: string }>;
            };
            const externalId = payload.message_id ?? payload.messages?.[0]?.id;
            if (!externalId) throw new Error('Missing delivery receipt');
            return { message: await update('sent', null, externalId) };
          } catch {
            return {
              message: await update('unknown', 'DELIVERY_OUTCOME_UNKNOWN'),
              error: new UnrecoverableError('Delivery outcome unknown; reconcile before retrying'),
            };
          }
        },
        { timeout: this.env.get('PROVIDER_TIMEOUT_MS') + 5000 },
      );
    const deadline = Date.now() + this.env.get('PROVIDER_TIMEOUT_MS') + 5000;
    let result = await send();
    while ('busy' in result) {
      if (Date.now() >= deadline) throw new Error('Conversation busy; retry delivery later');
      await new Promise((resolve) => setTimeout(resolve, 50));
      result = await send();
    }
    if (result.error) throw result.error;
    return result.message;
  }
}
