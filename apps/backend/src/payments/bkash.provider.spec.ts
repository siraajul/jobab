import { ConfigService } from '@nestjs/config';
import { BkashProvider } from './bkash.provider';
import { validateEnv } from '../config/env.schema';

describe('bKash environment selection', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each([
    ['false', 'https://tokenized.pay.bka.sh/'],
    ['0', 'https://tokenized.pay.bka.sh/'],
    ['true', 'https://tokenized.sandbox.bka.sh/'],
    [undefined, 'https://tokenized.sandbox.bka.sh/'],
  ])('uses the intended API for BKASH_SANDBOX=%p', async (sandbox, expectedBase) => {
    const env = validateEnv({
      DATABASE_URL: 'postgresql://u:p@localhost/test',
      REDIS_URL: 'redis://localhost',
      META_APP_SECRET: 's',
      META_VERIFY_TOKEN: 't',
      LLM_PROVIDER: 'stub',
      ENCRYPTION_KEY: 'x'.repeat(32),
      BKASH_SANDBOX: sandbox,
      BKASH_USERNAME: 'test',
      BKASH_PASSWORD: 'test',
      BKASH_APP_KEY: 'test',
      BKASH_APP_SECRET: 'test',
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ id_token: 'test-token' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ bkashURL: 'https://payment.example', paymentID: 'payment1' }),
      });
    global.fetch = fetchMock;
    const provider = new BkashProvider({
      get: (key: keyof typeof env) => env[key],
    } as ConfigService);
    await provider.createLink({ orderId: 'order1', amount: 100, currency: 'BDT' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [url] of fetchMock.mock.calls) expect(url.startsWith(expectedBase)).toBe(true);
  });
});
