import { Injectable, Logger } from '@nestjs/common';
import { EnvService } from '../config/env.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Outbound WhatsApp Business notifications via Twilio's WhatsApp API.
 *
 * The BD merchant lives in WhatsApp — much higher engagement than native
 * push. Pattern: when a conversation goes `needs_human`, send a one-line
 * alert + deep link to the dashboard.
 *
 * Provider abstraction is minimal (Twilio only for now); Gupshup or
 * Meta-direct Cloud API slot in if needed.
 */
@Injectable()
export class WhatsAppService {
  private readonly log = new Logger(WhatsAppService.name);

  constructor(
    private readonly env: EnvService,
    private readonly prisma: PrismaService,
  ) {}

  /** True if Twilio is configured (the dev/test path is a no-op log). */
  get enabled(): boolean {
    return !!this.env.get('WA_ACCOUNT_SID') && !!this.env.get('WA_AUTH_TOKEN') && !!this.env.get('WA_FROM');
  }

  /**
   * Send a notification to the org's configured merchant WhatsApp number.
   * No-op (with a log line) when the org hasn't set a phone, or when
   * Twilio credentials aren't configured.
   */
  async notifyOrg(organizationId: string, message: string): Promise<void> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { notificationPhone: true, name: true },
    });
    if (!org?.notificationPhone) return;

    if (!this.enabled || this.env.get('MESSENGER_DRY_RUN')) {
      this.log.log(
        `[dry-run] WhatsApp → ${org.notificationPhone} (${org.name}): ${message.slice(0, 80)}`,
      );
      return;
    }

    const sid = this.env.get('WA_ACCOUNT_SID')!;
    const auth = this.env.get('WA_AUTH_TOKEN')!;
    const from = this.env.get('WA_FROM')!;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
    const body = new URLSearchParams({
      From: `whatsapp:${from}`,
      To: `whatsapp:${org.notificationPhone}`,
      Body: message,
    });
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          authorization: 'Basic ' + Buffer.from(`${sid}:${auth}`).toString('base64'),
          'content-type': 'application/x-www-form-urlencoded',
        },
        body,
      });
      if (!res.ok) {
        this.log.warn(`Twilio ${res.status}: ${await res.text()}`);
      }
    } catch (err) {
      this.log.error(`Twilio network error: ${(err as Error).message}`);
    }
  }
}
