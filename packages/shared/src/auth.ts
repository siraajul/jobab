import { z } from 'zod';
import { MemberRoleSchema } from './enums';

export const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginBody = z.infer<typeof LoginBodySchema>;

export const SignUpBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120),
});
export type SignUpBody = z.infer<typeof SignUpBodySchema>;

export const AcceptInviteBodySchema = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});
export type AcceptInviteBody = z.infer<typeof AcceptInviteBodySchema>;

export const InvitePreviewSchema = z.object({
  email: z.string(),
  role: MemberRoleSchema,
  organizationName: z.string(),
  invitedBy: z.string(),
  expiresAt: z.string(),
});
export type InvitePreview = z.infer<typeof InvitePreviewSchema>;
