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
