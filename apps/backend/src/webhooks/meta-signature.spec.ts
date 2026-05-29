import { createHmac } from 'node:crypto';
import { verifyMetaSignature } from './meta-signature';

describe('verifyMetaSignature', () => {
  const secret = 'topsecret';
  const body = Buffer.from(JSON.stringify({ object: 'page', entry: [] }), 'utf8');
  const goodHeader = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  it('accepts a valid signature', () => {
    expect(verifyMetaSignature(body, goodHeader, secret)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const tampered = Buffer.from(body.toString('utf8') + ' ', 'utf8');
    expect(verifyMetaSignature(tampered, goodHeader, secret)).toBe(false);
  });

  it('rejects a missing header', () => {
    expect(verifyMetaSignature(body, undefined, secret)).toBe(false);
  });

  it('rejects a malformed header', () => {
    expect(verifyMetaSignature(body, 'sha1=abc', secret)).toBe(false);
  });
});
