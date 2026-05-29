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
