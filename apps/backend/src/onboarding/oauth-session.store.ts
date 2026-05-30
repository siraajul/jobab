import { Injectable } from '@nestjs/common';

/**
 * In-process store for OAuth-in-flight state. Two maps:
 *   • stateByOrg  — short-lived `{ state → orgId }` set during /start, read during /callback
 *   • tokenByOrg  — short-lived `{ orgId → encryptedUserToken }` set during /callback, read by /pages and /connect
 *
 * Cookies don't work for the OAuth dance because the merchant browses through
 * three origins (web :3001, backend :3000, facebook.com) and cookies are
 * scoped per-origin. Keeping the state server-side sidesteps that entirely.
 *
 * For a single-instance backend (the pilot setup), an in-memory Map is fine.
 * If we ever scale horizontally, swap this for Redis — the interface is tiny.
 */
@Injectable()
export class OAuthSessionStore {
  private readonly stateByOrg = new Map<string, { orgId: string; expiresAt: number }>();
  private readonly tokenByOrg = new Map<string, { encryptedToken: string; expiresAt: number }>();

  /** ttlMs default = 10 min — covers the round trip out to Facebook and back. */
  putState(state: string, orgId: string, ttlMs = 10 * 60 * 1000): void {
    this.gc();
    this.stateByOrg.set(state, { orgId, expiresAt: Date.now() + ttlMs });
  }

  /** Consumes the state (one-time read). Returns null on miss or expiry. */
  takeState(state: string): string | null {
    const entry = this.stateByOrg.get(state);
    if (!entry) return null;
    this.stateByOrg.delete(state);
    if (entry.expiresAt < Date.now()) return null;
    return entry.orgId;
  }

  /** ttlMs default = 10 min — merchant has this long to pick pages after returning from FB. */
  putToken(orgId: string, encryptedToken: string, ttlMs = 10 * 60 * 1000): void {
    this.gc();
    this.tokenByOrg.set(orgId, { encryptedToken, expiresAt: Date.now() + ttlMs });
  }

  peekToken(orgId: string): string | null {
    const entry = this.tokenByOrg.get(orgId);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.tokenByOrg.delete(orgId);
      return null;
    }
    return entry.encryptedToken;
  }

  clearToken(orgId: string): void {
    this.tokenByOrg.delete(orgId);
  }

  private gc(): void {
    const now = Date.now();
    for (const [k, v] of this.stateByOrg) {
      if (v.expiresAt < now) this.stateByOrg.delete(k);
    }
    for (const [k, v] of this.tokenByOrg) {
      if (v.expiresAt < now) this.tokenByOrg.delete(k);
    }
  }
}
