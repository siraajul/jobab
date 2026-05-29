import { BadRequestException, ExecutionContext, createParamDecorator } from '@nestjs/common';

/**
 * Phase 1 stand-in for real RBAC. Reads `x-org-id` from the request header so
 * the frontend can scope queries to a tenant in dev. Replace with a Clerk /
 * Supabase Auth resolver once §11 lands.
 */
export const OrgId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | string[] | undefined> }>();
  const raw = req.headers['x-org-id'];
  const orgId = Array.isArray(raw) ? raw[0] : raw;
  if (!orgId) throw new BadRequestException('x-org-id header required');
  return orgId;
});
