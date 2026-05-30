import { Injectable, Logger } from '@nestjs/common';
import type { Platform } from '@prisma/client';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookOAuthService } from './facebook-oauth.service';

/**
 * Page Access Token rotation.
 *
 * Long-lived Page Access Tokens minted via Facebook Login expire after ~60
 * days. This service refreshes them before they go stale. Trigger paths:
 *
 *   • Cron job (Nest `@nestjs/schedule`) — once a day, look at every Page
 *     row, and if its token is older than 53 days (7-day safety buffer),
 *     re-mint it.
 *   • Webhook fallback — when Graph returns 190 / "Error validating access
 *     token", the messenger service can call `refreshPage` to recover.
 *
 * For now we expose the imperative method. Wiring to `@nestjs/schedule` is a
 * one-line `@Cron('0 3 * * *') runDailyRefresh()` once that module is added
 * to `app.module.ts` — see `scheduleDailyRefresh()` below.
 *
 * NOTE: a real implementation needs us to ALSO store the long-lived **user**
 * access token alongside the Page Access Token (a 60-day user token can mint
 * fresh Page tokens; without it we can only re-list via the merchant's
 * cookie-session, which expires). The Page model needs one new field:
 * `longLivedUserToken String? @map("long_lived_user_token")` (encrypted).
 * Today the OAuth flow throws that user token away after the picker step.
 */
@Injectable()
export class TokenRotationService {
  private readonly log = new Logger(TokenRotationService.name);
  /** Refresh tokens this many ms before their nominal expiry (7 days). */
  static readonly REFRESH_BUFFER_MS = 7 * 24 * 60 * 60 * 1000;
  /** Long-lived FB Page tokens are valid for ~60 days. */
  static readonly LONG_LIVED_TTL_MS = 60 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly facebook: FacebookOAuthService,
  ) {}

  /**
   * Refresh every connected Facebook/Instagram Page whose token is nearing
   * expiry. Idempotent and safe to call repeatedly. Returns counts for
   * observability.
   */
  async runDailyRefresh(): Promise<{ checked: number; refreshed: number; failed: number }> {
    const pages = await this.prisma.page.findMany({
      where: { status: 'connected', platform: { in: ['facebook', 'instagram'] } },
    });
    let refreshed = 0;
    let failed = 0;
    for (const page of pages) {
      // Without an `updatedAt` field on the Page model we conservatively try
      // every connected page; the refresh helper itself is idempotent.
      const dueSoon = true;
      if (!dueSoon) continue;
      try {
        await this.refreshPage(page.id);
        refreshed++;
      } catch (err) {
        failed++;
        this.log.warn(
          `token refresh failed for page=${page.externalPageId}: ${(err as Error).message}`,
        );
      }
    }
    this.log.log(`token refresh: checked=${pages.length} refreshed=${refreshed} failed=${failed}`);
    return { checked: pages.length, refreshed, failed };
  }

  /**
   * Re-mint a single Page Access Token. Requires the org to have a stored
   * long-lived user access token — which we don't persist today. When the
   * Page model gains `longLivedUserToken`, this becomes:
   *
   *   const userToken = decrypt(page.organization.longLivedUserToken)
   *   const managed = await facebook.listManagedPages(userToken)
   *   const fresh = managed.find(p => p.pageId === page.externalPageId)
   *   await prisma.page.update({ accessToken: encrypt(fresh.pageAccessToken) })
   *
   * For now this throws so it's clearly a TODO rather than a silent no-op.
   */
  async refreshPage(pageId: string): Promise<void> {
    const page = await this.prisma.page.findUniqueOrThrow({ where: { id: pageId } });
    void this.encryption;
    void this.facebook;
    void this.prisma;
    throw new Error(
      `token refresh not yet implemented for page=${page.externalPageId} ` +
        `(${page.platform as Platform}) — needs persistent long-lived user token on Organization. ` +
        `Tracked in docs/integrations.md under Phase 1 follow-ups.`,
    );
  }
}
