import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { EnvService } from '../config/env.service';

/**
 * Scopes we request during Facebook Login. Covers both Messenger and
 * Instagram messaging — Instagram messaging rides on the same Page Access
 * Token as the linked FB Page, so one OAuth dance connects both channels.
 *
 * All of these need App Review before going live; in Development Mode they
 * work for testers without review.
 */
export const FACEBOOK_OAUTH_SCOPES = [
  'pages_show_list',
  'pages_messaging',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_manage_engagement',
  'instagram_basic',
  'instagram_manage_messages',
  'business_management',
];

export interface FacebookManagedPage {
  pageId: string;
  name: string;
  category: string | null;
  /** Page Access Token (already scoped to this page). Long-lived if the user token was long-lived. */
  pageAccessToken: string;
  instagramBusinessAccountId: string | null;
  instagramUsername: string | null;
}

/**
 * Thin wrapper around the Facebook Graph API endpoints we need for the OAuth
 * onboarding flow. Stateless — state-keeping (CSRF nonces, the user access
 * token between callback and connect) lives in the controller via cookies.
 */
@Injectable()
export class FacebookOAuthService {
  private readonly log = new Logger(FacebookOAuthService.name);

  constructor(private readonly env: EnvService) {}

  /** Returns true if META_APP_ID is configured. Otherwise the OAuth button is hidden. */
  isEnabled(): boolean {
    return Boolean(this.env.get('META_APP_ID'));
  }

  /** Generates a random opaque value to round-trip through the OAuth `state` param. */
  generateState(): string {
    return randomBytes(24).toString('hex');
  }

  /**
   * Builds the Facebook Login dialog URL. Caller is responsible for setting
   * an HttpOnly cookie carrying the same `state` so the callback can verify.
   */
  getAuthorizeUrl(state: string, redirectUri: string, scopes = FACEBOOK_OAUTH_SCOPES): string {
    const appId = this.requireAppId();
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      state,
      scope: scopes.join(','),
      response_type: 'code',
      auth_type: 'rerequest',
    });
    return `https://www.facebook.com/${this.graphVersion()}/dialog/oauth?${params.toString()}`;
  }

  /** Exchanges the OAuth code for a short-lived user access token. */
  async exchangeCodeForUserToken(code: string, redirectUri: string): Promise<string> {
    const appId = this.requireAppId();
    const appSecret = this.env.get('META_APP_SECRET');
    const params = new URLSearchParams({
      client_id: appId,
      client_secret: appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const url = `https://graph.facebook.com/${this.graphVersion()}/oauth/access_token?${params.toString()}`;
    const data = await this.fetchJson<{ access_token: string; token_type?: string }>(url);
    if (!data.access_token) {
      throw new BadRequestException('facebook: missing access_token in oauth response');
    }
    return data.access_token;
  }

  /**
   * Exchanges a short-lived user token for a long-lived one (~60 days).
   * Page Access Tokens minted from a long-lived user token are themselves
   * long-lived, which is what we want before storing them.
   */
  async exchangeForLongLivedUserToken(shortLivedToken: string): Promise<string> {
    const appId = this.requireAppId();
    const appSecret = this.env.get('META_APP_SECRET');
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: appId,
      client_secret: appSecret,
      fb_exchange_token: shortLivedToken,
    });
    const url = `https://graph.facebook.com/${this.graphVersion()}/oauth/access_token?${params.toString()}`;
    const data = await this.fetchJson<{ access_token: string }>(url);
    if (!data.access_token) {
      throw new BadRequestException('facebook: long-lived exchange returned no token');
    }
    return data.access_token;
  }

  /**
   * Lists the pages this user manages, with their long-lived Page Access
   * Tokens and any linked Instagram Business Account.
   */
  async listManagedPages(userAccessToken: string): Promise<FacebookManagedPage[]> {
    const fields = [
      'id',
      'name',
      'category',
      'access_token',
      'instagram_business_account{id,username}',
    ].join(',');
    const url = `https://graph.facebook.com/${this.graphVersion()}/me/accounts?fields=${fields}&limit=100&access_token=${encodeURIComponent(userAccessToken)}`;
    const data = await this.fetchJson<{
      data: Array<{
        id: string;
        name: string;
        category?: string;
        access_token: string;
        instagram_business_account?: { id: string; username?: string };
      }>;
    }>(url);
    return (data.data ?? []).map((p) => ({
      pageId: p.id,
      name: p.name,
      category: p.category ?? null,
      pageAccessToken: p.access_token,
      instagramBusinessAccountId: p.instagram_business_account?.id ?? null,
      instagramUsername: p.instagram_business_account?.username ?? null,
    }));
  }

  /**
   * Subscribes a page to the messaging webhook fields. Idempotent — Meta
   * returns success even if already subscribed. `subscribedFields` defaults
   * to what the Messenger ingest path consumes today.
   */
  async subscribePageToWebhook(
    pageId: string,
    pageAccessToken: string,
    subscribedFields: string[] = ['messages', 'messaging_postbacks', 'message_reads'],
  ): Promise<boolean> {
    const url = `https://graph.facebook.com/${this.graphVersion()}/${pageId}/subscribed_apps`;
    const body = new URLSearchParams({
      subscribed_fields: subscribedFields.join(','),
      access_token: pageAccessToken,
    });
    try {
      const data = await this.fetchJson<{ success?: boolean }>(url, {
        method: 'POST',
        body: body.toString(),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
      });
      return data.success === true;
    } catch (err) {
      this.log.warn(`subscribePageToWebhook(${pageId}) failed: ${(err as Error).message}`);
      return false;
    }
  }

  private graphVersion(): string {
    return this.env.get('META_GRAPH_VERSION');
  }

  private requireAppId(): string {
    const appId = this.env.get('META_APP_ID');
    if (!appId) {
      throw new BadRequestException(
        'Facebook OAuth is not configured — set META_APP_ID in the backend env.',
      );
    }
    return appId;
  }

  private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(url, init);
    const text = await res.text();
    if (!res.ok) {
      throw new BadRequestException(`facebook graph ${res.status}: ${text.slice(0, 400)}`);
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      throw new BadRequestException(`facebook graph: non-JSON response: ${text.slice(0, 200)}`);
    }
  }
}
