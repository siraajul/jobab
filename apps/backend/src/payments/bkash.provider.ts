import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentLinkRequest, PaymentLinkResult, PaymentProvider } from './payment-provider';

/**
 * bKash provider. The real flow is:
 *   1. POST /tokenized/checkout/token/grant (auth)
 *   2. POST /tokenized/checkout/create with amount + merchantInvoiceNumber
 *   3. Show payerReference / payment URL to the customer
 *
 * Without merchant credentials we return a dev URL so downstream code (order
 * panel, agent reply) has something concrete to display. Drop in the real
 * token exchange + create call once the merchant account is live.
 */
@Injectable()
export class BkashProvider implements PaymentProvider {
  readonly name = 'bkash';
  private readonly log = new Logger(BkashProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createLink(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    const username = this.config.get<string>('BKASH_USERNAME');
    const password = this.config.get<string>('BKASH_PASSWORD');
    const appKey = this.config.get<string>('BKASH_APP_KEY');
    const appSecret = this.config.get<string>('BKASH_APP_SECRET');
    const sandbox = this.config.get<string>('BKASH_SANDBOX') !== '0';

    if (!username || !password || !appKey || !appSecret) {
      // Dev fallback — log once and return a placeholder URL so the order
      // panel can still render "link sent". Replace BKASH_* env vars when
      // the merchant account is provisioned.
      const link = `https://dev.jobab.local/pay/bkash/${req.orderId}?amount=${req.amount}`;
      this.log.warn(`bKash creds not set — returning dev link ${link}`);
      return { provider: this.name, link };
    }

    const base = sandbox
      ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
      : 'https://tokenized.pay.bka.sh/v1.2.0-beta';

    // 1. Auth — grant token
    const tokenRes = await fetch(`${base}/tokenized/checkout/token/grant`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        username,
        password,
      },
      body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
    });
    if (!tokenRes.ok) throw new Error(`bKash auth: ${tokenRes.status} ${await tokenRes.text()}`);
    const tokenJson = (await tokenRes.json()) as { id_token?: string };
    if (!tokenJson.id_token) throw new Error('bKash auth: no id_token in response');

    // 2. Create payment
    const createRes = await fetch(`${base}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        authorization: tokenJson.id_token,
        'x-app-key': appKey,
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: req.customer?.phone ?? 'unknown',
        callbackURL: `${this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000'}/payments/bkash/callback`,
        amount: req.amount.toString(),
        currency: req.currency,
        intent: 'sale',
        merchantInvoiceNumber: req.orderId,
      }),
    });
    if (!createRes.ok) throw new Error(`bKash create: ${createRes.status} ${await createRes.text()}`);
    const createJson = (await createRes.json()) as { bkashURL?: string; paymentID?: string };
    if (!createJson.bkashURL) throw new Error('bKash create: missing bkashURL');

    return { provider: this.name, link: createJson.bkashURL, externalRef: createJson.paymentID };
  }
}
