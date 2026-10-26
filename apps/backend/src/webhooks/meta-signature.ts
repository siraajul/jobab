import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Validates Meta's X-Hub-Signature-256 header against the raw request body.
 * Meta sends `sha256=<hex>` computed with the App Secret over the raw POST body.
 */
export function verifyMetaSignature(
  rawBody: Buffer,
  header: string | undefined,
  appSecret: string,
): boolean {
  if (!header || !header.startsWith('sha256=')) return false;
  const provided = Buffer.from(header.slice('sha256='.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** Verify the signature over the encoded payload before trusting deletion data. */
export function verifyMetaSignedRequest(
  signedRequest: string,
  appSecret: string,
): { user_id: string } | null {
  const parts = signedRequest.split('.');
  if (parts.length !== 2 || !appSecret) return null;
  const [signature, encodedPayload] = parts;
  if (!/^[A-Za-z0-9_-]+$/.test(signature) || !/^[A-Za-z0-9_-]+$/.test(encodedPayload)) {
    return null;
  }
  const provided = Buffer.from(signature, 'base64url');
  const expected = createHmac('sha256', appSecret).update(encodedPayload).digest();
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  try {
    const payload: unknown = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (!payload || typeof payload !== 'object') return null;
    const { algorithm, user_id: userId } = payload as Record<string, unknown>;
    if (algorithm !== 'HMAC-SHA256' || typeof userId !== 'string' || !userId.trim()) return null;
    return { user_id: userId };
  } catch {
    return null;
  }
}
