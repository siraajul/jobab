import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Push notifications via the Expo Push API (the simplest path for an Expo-
 * built mobile client; it routes through APNs/FCM for us).
 *
 * In MESSENGER_DRY_RUN mode we log + skip the POST, so dev environments
 * don't hit Expo with unregistered tokens.
 */
@Injectable()
export class PushService {
  private readonly log = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  async notifyUser(userId: string, payload: PushPayload): Promise<void> {
    const tokens = await this.prisma.deviceToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;
    if (this.env.get('MESSENGER_DRY_RUN')) {
      this.log.log(`[dry-run] push to user=${userId} (${tokens.length} devices): ${payload.title}`);
      return;
    }
    const body = tokens.map((t) => ({
      to: t.token,
      title: payload.title,
      body: payload.body,
      data: payload.data ?? {},
      sound: 'default',
    }));
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) this.log.warn(`Expo push ${res.status}: ${await res.text()}`);
    } catch (err) {
      this.log.error(`Expo push network error: ${(err as Error).message}`);
    }
  }
}
