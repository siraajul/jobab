import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { EnvService } from '../config/env.service';

/**
 * Signed session cookie value: `<payload-b64>.<sig-b64>` where payload is
 *   { uid: string, iat: number, exp: number }
 * and sig = HMAC-SHA256(payload, sessionSecret).
 *
 * Keeping cookies self-contained means we don't need a server-side session
 * table; rotating ENCRYPTION_KEY invalidates every existing session, which is
 * the desired blast radius for a key rotation.
 */
export interface SessionPayload {
  uid: string;
  iat: number;
  exp: number;
}

const TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days
export const SESSION_COOKIE = 'jobab_session';

@Injectable()
export class SessionService {
  private readonly secret: Buffer;

  constructor(env: EnvService) {
    // Use the encryption key directly — its at-least-32-char invariant is
    // already enforced. Use a domain separator to keep it logically distinct.
    this.secret = createHmac('sha256', env.get('ENCRYPTION_KEY')).update('jobab.session.v1').digest();
  }

  sign(userId: string): { value: string; maxAge: number } {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionPayload = { uid: userId, iat: now, exp: now + TTL_SECONDS };
    const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
    return { value: `${payloadB64}.${sig}`, maxAge: TTL_SECONDS };
  }

  verify(cookieValue: string | undefined): SessionPayload | null {
    if (!cookieValue) return null;
    const [payloadB64, sig] = cookieValue.split('.');
    if (!payloadB64 || !sig) return null;
    const expected = createHmac('sha256', this.secret).update(payloadB64).digest('base64url');
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    let payload: SessionPayload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    } catch {
      return null;
    }
    if (typeof payload.uid !== 'string' || typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  }

  /** Generate a random invite token. The DB stores `hashInviteToken(token)`. */
  generateInviteToken(): { token: string; hash: string } {
    const token = randomBytes(24).toString('base64url');
    return { token, hash: this.hashInviteToken(token) };
  }

  hashInviteToken(token: string): string {
    return createHmac('sha256', this.secret).update(`jobab.invite.v1:${token}`).digest('hex');
  }
}
