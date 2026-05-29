import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EnvService } from '../config/env.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Meta Send API client (spec §7). POSTs the agent's reply to
 *   https://graph.facebook.com/{VERSION}/me/messages
 * using the page access token stored on `pages.access_token` (AES-GCM at rest).
 *
 * The 24-hour standard messaging window is enforced here — outside it, we
 * refuse to send unless an approved message tag is configured (Phase 2).
 *
 * Set MESSENGER_DRY_RUN=true to skip the Graph call (for local testing with
 * fake PSIDs). The outgoing message is still persisted so the inbox UI shows
 * what the AI would have said.
 */
const DEV_TOKEN_SENTINEL = 'dev-token-not-used-in-fake-mode';

@Injectable()
export class MessengerService {
  private readonly log = new Logger(MessengerService.name);
  private static readonly WINDOW_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly encryption: EncryptionService,
  ) {}

  async sendText(
    conversationId: string,
    text: string,
    attachments?: Record<string, unknown>,
  ): Promise<void> {
    const conv = await this.prisma.conversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { page: true },
    });

    const lastIn = conv.lastCustomerMessageAt?.getTime() ?? 0;
    const withinWindow = Date.now() - lastIn < MessengerService.WINDOW_MS;
    if (!withinWindow) {
      this.log.warn(
        `refusing send: outside 24h window (conv=${conversationId}). ` +
          `Configure a message tag in MessengerService to override.`,
      );
      return;
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
