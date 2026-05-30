import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Platform, Prisma } from '@prisma/client';
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
  private readonly log = new Logger(MessengerService.name);

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
  ): Promise<void> {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { page: true },
    });

    const window = await this.getMessagingWindow(conversationId);
    if (!window.canSend) {
      this.log.warn(
        `refusing send: ${window.reason} (conv=${conversationId}, platform=${window.platform})`,
      );
      throw new OutOfMessagingWindowError(window);
    }

    // Persist first so the inbox shows it even if Graph rejects the call.
    await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'out',
        sender: 'agent',
        content: text,
        attachments: attachments ? (attachments as Prisma.InputJsonValue) : undefined,
      },
    });

    if (this.env.get('MESSENGER_DRY_RUN')) {
      this.log.log(
        `[dry-run] would POST to Graph psid=${conv.externalUserId} text="${text.slice(0, 60)}…"`,
      );
      return;
    }

    if (!conv.page.accessToken || conv.page.accessToken === DEV_TOKEN_SENTINEL) {
      this.log.warn(
        `no real access token for page ${conv.page.externalPageId} — skipping Graph call. ` +
          `Connect a real page via /onboarding or set MESSENGER_DRY_RUN=true.`,
      );
      return;
    }

    let pageToken: string;
    try {
      pageToken = this.encryption.decrypt(conv.page.accessToken);
    } catch (err) {
      this.log.error(
        `failed to decrypt page token for ${conv.page.externalPageId}: ${(err as Error).message}`,
      );
      return;
    }

    const version = this.env.get('META_GRAPH_VERSION');
    const url = `https://graph.facebook.com/${version}/me/messages?access_token=${encodeURIComponent(pageToken)}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: conv.externalUserId },
          message: { text },
          messaging_type: 'RESPONSE',
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        this.log.error(`Send API ${res.status} for psid=${conv.externalUserId}: ${body}`);
      }
    } catch (err) {
      this.log.error(`Send API network error: ${(err as Error).message}`);
    }
  }
}
