import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EnvService } from '../config/env.service';

@Injectable()
export class MailService {
  constructor(private readonly env: EnvService) {}

  assertConfigured() {
    if (this.env.get('EMAIL_MODE') === 'disabled') {
      throw new ServiceUnavailableException(
        'Account recovery is temporarily unavailable. Contact support.',
      );
    }
  }

  async sendPasswordReset(to: string, token: string, deliveryId: string) {
    this.assertConfigured();
    const origin = this.env.get('WEB_ORIGIN').split(',')[0];
    const url = new URL('/login', origin);
    url.searchParams.set('reset', token);
    const message = {
      from: this.env.get('EMAIL_FROM'),
      to: [to],
      subject: 'Reset your Jobab password',
      text: `Use this link within 30 minutes to reset your password:\n${url.href}\n\nIf you did not request this, ignore this email.`,
    };
    if (this.env.get('EMAIL_MODE') === 'outbox' && this.env.get('NODE_ENV') !== 'production') {
      const folder = resolve('.jobab/mail');
      await mkdir(folder, { recursive: true, mode: 0o700 });
      await writeFile(resolve(folder, `${deliveryId}.json`), JSON.stringify(message), {
        mode: 0o600,
      });
      return;
    }
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
      headers: {
        authorization: `Bearer ${this.env.get('RESEND_API_KEY')}`,
        'content-type': 'application/json',
        'idempotency-key': deliveryId,
      },
      body: JSON.stringify(message),
    });
    if (!response.ok)
      throw new ServiceUnavailableException(
        'Account recovery is temporarily unavailable. Try again later.',
      );
  }
}
