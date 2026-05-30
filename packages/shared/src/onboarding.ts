import { z } from 'zod';
import { PlatformSchema } from './enums';

export const OnboardingStatusSchema = z.object({
  pageConnected: z.boolean(),
  catalogLoaded: z.boolean(),
  aiInstructionsSet: z.boolean(),
  ready: z.boolean(),
  productCount: z.number().int(),
  pageCount: z.number().int(),
  catalogSource: z.string().nullable(),
});
export type OnboardingStatus = z.infer<typeof OnboardingStatusSchema>;

export const ConnectPageBodySchema = z.object({
  externalPageId: z.string().min(1),
  accessToken: z.string().min(1),
  platform: PlatformSchema.default('facebook'),
});
export type ConnectPageBody = z.infer<typeof ConnectPageBodySchema>;

/**
 * One row returned by `GET /onboarding/facebook/pages` — a page the
 * authenticated Facebook user manages, plus its linked Instagram Business
 * Account if any. The frontend renders this as a checkbox list so the
 * merchant can pick which page(s) to connect.
 */
export const FacebookPageOptionSchema = z.object({
  pageId: z.string().min(1),
  name: z.string(),
  category: z.string().nullable(),
  instagramBusinessAccountId: z.string().nullable(),
  instagramUsername: z.string().nullable(),
});
export type FacebookPageOption = z.infer<typeof FacebookPageOptionSchema>;

export const FacebookPagesResponseSchema = z.object({
  pages: z.array(FacebookPageOptionSchema),
});
export type FacebookPagesResponse = z.infer<typeof FacebookPagesResponseSchema>;

export const ConnectFacebookPagesBodySchema = z.object({
  /** List of Page IDs the merchant chose to connect. */
  pageIds: z.array(z.string().min(1)).min(1),
  /** When true, also connect any Instagram Business Account linked to each picked page. */
  includeInstagram: z.boolean().default(true),
});
export type ConnectFacebookPagesBody = z.infer<typeof ConnectFacebookPagesBodySchema>;

export const ConnectFacebookPagesResponseSchema = z.object({
  connected: z.array(
    z.object({
      pageId: z.string(),
      platform: PlatformSchema,
      name: z.string(),
      webhookSubscribed: z.boolean(),
    }),
  ),
});
export type ConnectFacebookPagesResponse = z.infer<typeof ConnectFacebookPagesResponseSchema>;

/** GET /onboarding/facebook/oauth-config — tells the web app whether OAuth is wired. */
export const OAuthConfigResponseSchema = z.object({
  facebookEnabled: z.boolean(),
});
export type OAuthConfigResponse = z.infer<typeof OAuthConfigResponseSchema>;
