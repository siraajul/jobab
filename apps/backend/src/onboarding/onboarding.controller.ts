import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ConnectFacebookPagesBodySchema, ConnectPageBodySchema } from '@jobab/shared';
import { OrgId, Public } from '../auth/auth.guard';
import { EnvService } from '../config/env.service';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiInlineOk,
  ApiZodBody,
  ApiZodOk,
} from '../swagger/decorators';
import { FacebookOAuthService } from './facebook-oauth.service';
import { OAuthSessionStore } from './oauth-session.store';
import { OnboardingService } from './onboarding.service';

@ApiTags('onboarding')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly svc: OnboardingService,
    private readonly env: EnvService,
    private readonly facebook: FacebookOAuthService,
    private readonly oauthStore: OAuthSessionStore,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Onboarding checklist status',
    description:
      'Snapshot of where the merchant is in the connect-pages → catalog → AI-instructions flow. ' +
      'The dashboard renders a checklist off this; once all three are `true` the org is live.',
  })
  @ApiZodOk('OnboardingStatus', 'Booleans + supporting counters.')
  status(@OrgId() orgId: string) {
    return this.svc.getStatus(orgId);
  }

  @Post('pages')
  @ApiOperation({
    summary: 'Connect a Facebook / Instagram / WhatsApp page (manual)',
    description:
      'Upserts a `Page` row from a manually pasted ID + access token. Kept for ' +
      'WhatsApp setup and for pilot merchants connecting before App Review is approved. ' +
      'The OAuth-driven path is `POST /onboarding/facebook/connect`.',
  })
  @ApiZodBody('ConnectPageBody', 'Page ID + access token + platform.')
  @ApiInlineOk('The created or updated Page row.', {
    id: 'cm0page1',
    platform: 'facebook',
    externalPageId: 'page_rongdhonu',
    status: 'connected',
    webhookSubscribed: false,
  })
  connectPage(@OrgId() orgId: string, @Body() body: unknown) {
    return this.svc.connectPage(orgId, ConnectPageBodySchema.parse(body));
  }

  // ─── Facebook OAuth ──────────────────────────────────────────────────

  @Get('facebook/oauth-config')
  @ApiOperation({
    summary: 'Is the Facebook OAuth onboarding flow available?',
    description:
      'Frontends hit this to decide whether to render the "Connect with Facebook" button or ' +
      'fall back to the manual paste form. OAuth is enabled when META_APP_ID is set.',
  })
  @ApiInlineOk('OAuth availability flag.', { facebookEnabled: true })
  oauthConfig() {
    return { facebookEnabled: this.facebook.isEnabled() };
  }

  @Post('facebook/start')
  @ApiOperation({
    summary: 'Begin Facebook Login OAuth flow',
    description:
      'Generates a CSRF state nonce, stores `{state → orgId}` server-side, and returns ' +
      'the Facebook OAuth dialog URL for the browser to navigate to. The web app does a ' +
      '`window.location.href = url` after this call returns.',
  })
  @ApiInlineOk('Authorize URL the browser should navigate to.', {
    url: 'https://www.facebook.com/v20.0/dialog/oauth?client_id=...&state=...',
  })
  startFacebookOAuth(@OrgId() orgId: string) {
    const state = this.facebook.generateState();
    this.oauthStore.putState(state, orgId);
    const url = this.facebook.getAuthorizeUrl(state, this.callbackUri());
    return { url };
  }

  /**
   * Facebook calls this endpoint after the user approves the app. It's
   * Public — we identify the merchant via the state nonce, not via session
   * cookies (which aren't carried across the third-party redirect).
   */
  @Get('facebook/callback')
  @Public()
  @ApiOperation({
    summary: 'Facebook OAuth callback',
    description:
      'Hit by Facebook redirecting the browser back. Looks up the state nonce → orgId, ' +
      'exchanges code → short-lived → long-lived user access token, stashes it server-side, ' +
      "and redirects the browser to the web app's page-picker.",
  })
  async facebookCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      return res.redirect(
        this.webCallbackUrl(`?fb=error&reason=${encodeURIComponent(errorDescription ?? error)}`),
      );
    }
    if (!code || !state) {
      return res.redirect(this.webCallbackUrl('?fb=error&reason=missing_params'));
    }
    const orgId = this.oauthStore.takeState(state);
    if (!orgId) {
      return res.redirect(this.webCallbackUrl('?fb=error&reason=state_expired'));
    }
    try {
      await this.svc.completeFacebookOAuth(orgId, code, this.callbackUri());
      res.redirect(this.webCallbackUrl('?fb=connected'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      res.redirect(this.webCallbackUrl(`?fb=error&reason=${encodeURIComponent(msg)}`));
    }
  }

  @Get('facebook/pages')
  @ApiOperation({
    summary: 'List Facebook pages the merchant can connect',
    description:
      'After OAuth callback succeeds, the web app calls this to render a picker. ' +
      'Each row includes the linked Instagram Business Account if one exists.',
  })
  @ApiInlineOk('Array of pages the authenticated user manages.', {
    pages: [
      {
        pageId: '111222333',
        name: 'Rongdhonu Saree',
        category: 'Clothing Store',
        instagramBusinessAccountId: '17841401234567890',
        instagramUsername: 'rongdhonu.saree',
      },
    ],
  })
  async listFacebookPages(@OrgId() orgId: string) {
    return { pages: await this.svc.listFacebookPages(orgId) };
  }

  @Post('facebook/connect')
  @ApiOperation({
    summary: 'Connect the picked Facebook pages (and linked Instagram accounts)',
    description:
      'Iterates the selected pages, subscribes each to the messaging webhook, and upserts ' +
      'one `Page` row per channel (FB always; IG too when linked and `includeInstagram` is true). ' +
      'The long-lived Page Access Token is encrypted at rest. Clears the OAuth session on success.',
  })
  @ApiZodBody('ConnectFacebookPagesBody', 'Picked page IDs + IG inclusion flag.')
  @ApiInlineOk('Per-page connection result.', {
    connected: [
      {
        pageId: '111222333',
        platform: 'facebook',
        name: 'Rongdhonu Saree',
        webhookSubscribed: true,
      },
      {
        pageId: '17841401234567890',
        platform: 'instagram',
        name: 'rongdhonu.saree',
        webhookSubscribed: true,
      },
    ],
  })
  async connectFacebookPages(@OrgId() orgId: string, @Body() body: unknown) {
    const connected = await this.svc.connectFacebookPages(
      orgId,
      ConnectFacebookPagesBodySchema.parse(body),
    );
    return { connected };
  }

  // ─── helpers ────────────────────────────────────────────────────────

  private callbackUri(): string {
    return `${this.env.get('PUBLIC_URL')}/onboarding/facebook/callback`;
  }

  private webCallbackUrl(query: string): string {
    return `${this.env.get('WEB_ORIGIN')}/onboarding/callback${query}`;
  }
}
