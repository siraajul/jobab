import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentLinkRequest, PaymentLinkResult, PaymentProvider } from './payment-provider';

export interface BkashPayment {
  paymentID?: string;
  bkashURL?: string;
  trxID?: string;
  amount?: string;
  currency?: string;
  merchantInvoiceNumber?: string;
  transactionStatus?: string;
  statusCode?: string;
  id_token?: string;
}

@Injectable()
export class BkashProvider implements PaymentProvider {
  readonly name = 'bkash';
  constructor(private readonly config: ConfigService) {}

  async createLink(req: PaymentLinkRequest): Promise<PaymentLinkResult> {
    // Cash-on-delivery never manufactures a payment URL, including in production.
    if (this.config.get<string>('PAYMENT_MODE') !== 'bkash') {
      throw new ServiceUnavailableException('Online payments are disabled; use cash on delivery');
    }
    const payment = await this.request('create', {
      mode: '0011',
      payerReference: req.customer?.phone ?? req.orderId,
      callbackURL: `${this.config.get<string>('PUBLIC_URL')}/payments/bkash/callback`,
      amount: req.amount.toFixed(2),
      currency: req.currency,
      intent: 'sale',
      merchantInvoiceNumber: req.orderId,
    });
    if (!payment.bkashURL || !payment.paymentID || !payment.bkashURL.startsWith('https://')) {
      throw new Error('bKash returned an invalid payment link');
    }
    return { provider: this.name, link: payment.bkashURL, externalRef: payment.paymentID };
  }

  query(paymentID: string) {
    return this.request('payment/status', { paymentID });
  }
  execute(paymentID: string) {
    return this.request('execute', { paymentID });
  }

  private async request(path: string, body: Record<string, string>): Promise<BkashPayment> {
    if (this.config.get<string>('PAYMENT_MODE') !== 'bkash')
      throw new ServiceUnavailableException('Online payments disabled');
    const username = this.config.get<string>('BKASH_USERNAME');
    const password = this.config.get<string>('BKASH_PASSWORD');
    const appKey = this.config.get<string>('BKASH_APP_KEY');
    const appSecret = this.config.get<string>('BKASH_APP_SECRET');
    if (!username || !password || !appKey || !appSecret)
      throw new ServiceUnavailableException('bKash is not configured');
    const base =
      (this.config.get<boolean>('BKASH_SANDBOX') ?? true)
        ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta'
        : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
    const post = async (
      endpoint: string,
      data: Record<string, string>,
      headers: Record<string, string>,
    ) => {
      const response = await fetch(`${base}/tokenized/checkout/${endpoint}`, {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.get<number>('PROVIDER_TIMEOUT_MS') ?? 15000),
        headers: { 'content-type': 'application/json', accept: 'application/json', ...headers },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error(`bKash request failed (${response.status})`);
      const result = (await response.json()) as BkashPayment;
      if (result.statusCode && result.statusCode !== '0000')
        throw new Error('bKash rejected the request');
      return result;
    };
    const token = await post(
      'token/grant',
      { app_key: appKey, app_secret: appSecret },
      { username, password },
    );
    if (!token.id_token) throw new Error('bKash authentication failed');
    return post(path, body, { authorization: token.id_token, 'x-app-key': appKey });
  }
}
