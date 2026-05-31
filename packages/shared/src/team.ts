import { z } from 'zod';
import { MemberRoleSchema } from './enums';

export const MembershipRefSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  role: MemberRoleSchema,
});
export type MembershipRef = z.infer<typeof MembershipRefSchema>;

export const CurrentUserSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  memberships: z.array(MembershipRefSchema),
});
export type CurrentUser = z.infer<typeof CurrentUserSchema>;

export const MemberRowSchema = z.object({
  id: z.string(),
  role: MemberRoleSchema,
  user: z.object({
    id: z.string(),
    email: z.string(),
    name: z.string().nullable(),
  }),
  createdAt: z.string(),
});
export type MemberRow = z.infer<typeof MemberRowSchema>;

export const InviteRowSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: MemberRoleSchema,
  expiresAt: z.string(),
  createdAt: z.string(),
});
export type InviteRow = z.infer<typeof InviteRowSchema>;
