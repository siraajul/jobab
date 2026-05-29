import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { MemberRole } from '@prisma/client';
import { AuthService, type AuthenticatedContext } from './auth.service';
import { SESSION_COOKIE } from './session.service';

export type { AuthenticatedContext } from './auth.service';

/** Mark a controller/route as public (no auth required). */
export const PUBLIC_KEY = 'auth:public';
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(PUBLIC_KEY, true);

/** Roles allowed on the route. Empty = any membership in the active org. */
export const ROLES_KEY = 'auth:roles';

type RequestWithAuth = Request & {
  user?: AuthenticatedContext;
  membership?: AuthenticatedContext['memberships'][number];
};

/**
 * AuthGuard — resolves the current user from the session cookie and the
 * "active organization" from one of (preferred order):
 *   1. cookie `jobab_org`
 *   2. header `x-org-id`
 *   3. the user's only membership (if there's exactly one)
 * Verifies the user has a membership in that org. Reads role metadata via
 * `@Roles(...)` to enforce role checks.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
    const cookieValue = req.cookies?.[SESSION_COOKIE];
    const user = await this.auth.loadFromSession(cookieValue);
    if (!user) throw new UnauthorizedException('not authenticated');

    const orgIdFromCookie = req.cookies?.['jobab_org'];
    const orgIdFromHeader = req.headers['x-org-id'];
    const orgId =
      orgIdFromCookie ??
      (Array.isArray(orgIdFromHeader) ? orgIdFromHeader[0] : orgIdFromHeader) ??
      (user.memberships.length === 1 ? user.memberships[0].organizationId : undefined);
    if (!orgId) throw new ForbiddenException('no active organization');

    const membership = user.memberships.find((m) => m.organizationId === orgId);
    if (!membership) throw new ForbiddenException('not a member of this organization');

    const requiredRoles = this.reflector.getAllAndOverride<MemberRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(membership.role)) {
        throw new ForbiddenException(`requires one of: ${requiredRoles.join(', ')}`);
      }
    }

    req.user = user;
    req.membership = membership;
    return true;
  }
}

/** Decorator: restrict route to the listed roles. */
export const Roles =
  (...roles: MemberRole[]): MethodDecorator =>
  (target, key, descriptor) => {
    Reflect.defineMetadata(ROLES_KEY, roles, descriptor.value as object);
    return descriptor;
  };

/** Param decorator: inject the authenticated user. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
  if (!req.user) throw new UnauthorizedException('not authenticated');
  return req.user;
});

/** Param decorator: inject the active membership (org + role). */
export const CurrentMembership = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
  if (!req.membership) throw new UnauthorizedException('not authenticated');
  return req.membership;
});

/** Convenience: just the active organization id (replaces the old OrgId). */
export const OrgId = createParamDecorator((_: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest<RequestWithAuth>();
  if (!req.membership) throw new UnauthorizedException('not authenticated');
  return req.membership.organizationId;
});
