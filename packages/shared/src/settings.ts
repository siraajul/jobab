import { z } from 'zod';
import { CatalogSourceSchema, OrgStatusSchema, PageStatusSchema, PlatformSchema } from './enums';

export const SettingsPayloadSchema = z.object({
  id: z.string(),
  name: z.string(),
  aiInstructions: z.string(),
  notificationPhone: z.string().nullable(),
  catalogSource: CatalogSourceSchema.nullable(),
  productCount: z.number().int(),
  pages: z.array(
    z.object({
      id: z.string(),
      platform: PlatformSchema,
      externalPageId: z.string(),
      status: PageStatusSchema,
      webhookSubscribed: z.boolean(),
    }),
  ),
  status: OrgStatusSchema,
});
export type SettingsPayload = z.infer<typeof SettingsPayloadSchema>;

export const UpdateSettingsBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  aiInstructions: z.string().max(20_000).optional(),
  notificationPhone: z
    .string()
    .regex(/^\+?[1-9]\d{6,15}$/, 'Use E.164 format, e.g. +8801711000000')
    .nullable()
    .optional(),
});
export type UpdateSettingsBody = z.infer<typeof UpdateSettingsBodySchema>;
