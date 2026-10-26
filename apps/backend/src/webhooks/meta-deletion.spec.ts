import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaWebhookService } from './meta-webhook.service';
import { verifyMetaSignedRequest } from './meta-signature';

const secret = 'deletion-test-secret';
function signed(payload: unknown, key = secret): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${createHmac('sha256', key).update(encoded).digest('base64url')}.${encoded}`;
}
const valid = { algorithm: 'HMAC-SHA256', user_id: 'customer1' };

describe('Meta data deletion', () => {
  const service = {
    recordDeletion: jest.fn(async () => undefined),
    scrubExternalUser: jest.fn(async () => undefined),
  };
  const config: Record<string, string> = {
    META_APP_SECRET: secret,
    PUBLIC_URL: 'https://jobab.example',
  };
  const controller = new MetaController(
    { get: (key: string) => config[key] } as ConfigService,
    service as unknown as MetaWebhookService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('accepts a signed request and scrubs only the verified user', async () => {
    const result = await controller.dataDeletion({ signed_request: signed(valid) });
    expect(service.scrubExternalUser).toHaveBeenCalledWith('customer1');
    expect(result.confirmation_code).toBeDefined();
  });

  it.each([
    signed(valid, 'attacker-key'),
    signed({ ...valid, algorithm: 'none' }),
    signed({ algorithm: 'HMAC-SHA256' }),
    signed({ ...valid, user_id: '' }),
    signed({ ...valid, user_id: 123 }),
    'invalid',
    `${signed(valid)}.extra`,
  ])('rejects invalid input without deleting anything: %s', async (value) => {
    await expect(controller.dataDeletion({ signed_request: value })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(service.scrubExternalUser).not.toHaveBeenCalled();
  });

  it('rejects a payload altered after signing', async () => {
    const [signature] = signed(valid).split('.');
    const tampered = Buffer.from(JSON.stringify({ ...valid, user_id: 'victim' })).toString(
      'base64url',
    );
    await expect(
      controller.dataDeletion({ signed_request: `${signature}.${tampered}` }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.scrubExternalUser).not.toHaveBeenCalled();
  });

  it('rejects correctly signed malformed JSON and missing app secrets', () => {
    const encoded = Buffer.from('{').toString('base64url');
    const signature = createHmac('sha256', secret).update(encoded).digest('base64url');
    expect(verifyMetaSignedRequest(`${signature}.${encoded}`, secret)).toBeNull();
    expect(verifyMetaSignedRequest(signed(valid), '')).toBeNull();
  });

  it('does not acknowledge deletion when the purge fails', async () => {
    service.scrubExternalUser.mockRejectedValueOnce(new Error('database unavailable'));
    await expect(controller.dataDeletion({ signed_request: signed(valid) })).rejects.toThrow(
      'database unavailable',
    );
  });
});
