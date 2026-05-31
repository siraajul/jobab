import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Platform } from '@prisma/client';
import { EncryptionService } from '../common/encryption/encryption.service';
import { PrismaService } from '../prisma/prisma.service';
import { FacebookOAuthService } from './facebook-oauth.service';
import { OAuthSessionStore } from './oauth-session.store';

export interface ConnectedPage {
  pageId: string;
  platform: Platform;
  name: string;
  webhookSubscribed: boolean;
}

/**
 * The onboarding business logic. The controller does HTTP plumbing
 * (param parsing, redirects, Swagger docs) and delegates to this service for
 * everything that touches the DB or the Meta OAuth flow.
 */
@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly facebook: FacebookOAuthService,
    private readonly oauthStore: OAuthSessionStore,
  ) {}

  async getStatus(orgId: string) {
    const [org, productCount, pageCount] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: orgId } }),
      this.prisma.product.count({ where: { organizationId: orgId } }),
      this.prisma.page.count({ where: { organizationId: orgId } }),
    ]);
    return {
      pageConnected: pageCount > 0,
      catalogLoaded: productCount > 0,
      aiInstructionsSet: !!org.aiInstructions?.trim(),
      ready: pageCount > 0 && productCount > 0 && !!org.aiInstructions?.trim(),
      productCount,
      pageCount,
      catalogSource: org.catalogSource,
    };
  }

  /**
   * Upsert a `Page` row from a manually pasted page ID + access token. Kept
   * for WhatsApp + pre-app-review pilot setups. The OAuth-driven path is
   * `completeFacebookOAuth` / `connectFacebookPages` below.
   */
  connectPage(
    orgId: string,
    input: { externalPageId: string; accessToken: string; platform: string },
  ) {
    const encrypted = this.encryption.encrypt(input.accessToken);
    const platform = input.platform as Platform;
    return this.prisma.page.upsert({
      where: {
        platform_externalPageId: { platform, externalPageId: input.externalPageId },
      },
      update: { accessToken: encrypted, organizationId: orgId, status: 'connected' },
      create: {
        organizationId: orgId,
        platform,
        externalPageId: input.externalPageId,
        accessToken: encrypted,
        status: 'connected',
        webhookSubscribed: false,
      },
    });
  }

  /**
   * Exchange the OAuth code for a long-lived user token and stash it under
   * the org so the page-picker call can use it. Throws on Meta exchange
   * errors so the caller can redirect with `?fb=error&reason=…`.
   */
  async completeFacebookOAuth(orgId: string, code: string, callbackUri: string) {
    const shortLived = await this.facebook.exchangeCodeForUserToken(code, callbackUri);
    const longLived = await this.facebook.exchangeForLongLivedUserToken(shortLived);
    this.oauthStore.putToken(orgId, this.encryption.encrypt(longLived));
  }

  async listFacebookPages(orgId: string) {
    const userToken = this.readFbToken(orgId);
    const pages = await this.facebook.listManagedPages(userToken);
    return pages.map((p) => ({
      pageId: p.pageId,
      name: p.name,
      category: p.category,
      instagramBusinessAccountId: p.instagramBusinessAccountId,
      instagramUsername: p.instagramUsername,
    }));
  }

  /**
   * Subscribe each picked page to the messaging webhook and persist a `Page`
   * row per channel (FB always; IG too when linked and `includeInstagram`).
   * The long-lived page access token is encrypted at rest. Clears the OAuth
   * session on success so the same token can't be reused.
   */
  async connectFacebookPages(
    orgId: string,
    input: { pageIds: string[]; includeInstagram: boolean },
  ): Promise<ConnectedPage[]> {
    const userToken = this.readFbToken(orgId);
    const managed = await this.facebook.listManagedPages(userToken);
    const picked = managed.filter((p) => input.pageIds.includes(p.pageId));
    if (picked.length === 0) {
      throw new BadRequestException("none of the picked page IDs match the merchant's pages");
    }

    const connected: ConnectedPage[] = [];
    for (const page of picked) {
      const subscribed = await this.facebook.subscribePageToWebhook(
        page.pageId,
        page.pageAccessToken,
      );
      const encryptedToken = this.encryption.encrypt(page.pageAccessToken);
      await this.upsertPage(orgId, 'facebook', page.pageId, encryptedToken, subscribed);
      connected.push({
        pageId: page.pageId,
        platform: 'facebook',
        name: page.name,
        webhookSubscribed: subscribed,
      });

      if (input.includeInstagram && page.instagramBusinessAccountId) {
        // IG Business Account uses the linked Page's access token.
        await this.upsertPage(
          orgId,
          'instagram',
          page.instagramBusinessAccountId,
          encryptedToken,
          subscribed,
        );
        connected.push({
          pageId: page.instagramBusinessAccountId,
          platform: 'instagram',
          name: page.instagramUsername ?? page.name,
          webhookSubscribed: subscribed,
        });
      }
    }

    this.oauthStore.clearToken(orgId);
    return connected;
  }

  private upsertPage(
    orgId: string,
    platform: Platform,
    externalPageId: string,
    encryptedAccessToken: string,
    subscribed: boolean,
  ) {
    return this.prisma.page.upsert({
      where: { platform_externalPageId: { platform, externalPageId } },
      update: {
        accessToken: encryptedAccessToken,
        organizationId: orgId,
        status: 'connected',
        webhookSubscribed: subscribed,
      },
      create: {
        organizationId: orgId,
        platform,
        externalPageId,
        accessToken: encryptedAccessToken,
        status: 'connected',
        webhookSubscribed: subscribed,
      },
    });
  }

  private readFbToken(orgId: string): string {
    const enc = this.oauthStore.peekToken(orgId);
    if (!enc) {
      throw new UnauthorizedException(
        'no Facebook OAuth session — restart by hitting POST /onboarding/facebook/start',
      );
    }
    try {
      return this.encryption.decrypt(enc);
    } catch {
      throw new UnauthorizedException('Facebook OAuth session is malformed; restart the flow');
    }
  }
}
