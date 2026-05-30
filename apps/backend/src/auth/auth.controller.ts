import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiBadRequest,
  ApiInlineOk,
  ApiZodBody,
  ApiZodOk,
} from '../swagger/decorators';
import { AuthService } from './auth.service';
import { SESSION_COOKIE, SessionService } from './session.service';
import { Public } from './auth.guard';

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const SignUpBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().min(1).max(120),
  organizationName: z.string().min(1).max(120),
});

const AcceptInviteBody = z.object({
  token: z.string().min(1),
  name: z.string().min(1).max(120),
  password: z.string().min(8).max(200),
});

const SetActiveOrgBody = z.object({ organizationId: z.string().min(1) });

const InspectInviteQuery = z.object({ token: z.string().min(1) });

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly session: SessionService,
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Log in with email + password',
    description:
      'Starts a session. The server sets a `session` cookie (HttpOnly, SameSite=Lax) and a ' +
      '`jobab_org` cookie pointing at your first org. Browsers persist these automatically; ' +
      'with curl pass `-c cookies.txt -b cookies.txt`.',
  })
  @ApiZodBody('LoginBody', 'Email + password.')
  @ApiInlineOk('User profile + memberships. The session cookie is set on the response.', {
    userId: 'cm0user123',
    email: 'owner@shop.com',
    name: 'Owner Name',
    memberships: [{ id: 'cm0mem123', organizationId: 'cm0org123', role: 'owner' }],
  })
  @ApiBadRequest('Bad email / password.')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { email, password } = LoginBody.parse(body);
    const { user, cookie } = await this.auth.login(email, password);
    this.setCookie(res, SESSION_COOKIE, cookie.value, cookie.maxAge);
    if (user.memberships.length > 0) {
      this.setCookie(res, 'jobab_org', user.memberships[0].organizationId, cookie.maxAge);
    }
    return user;
  }

  @Public()
  @Post('sign-up')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Create a new organisation with an owner account',
    description:
      'One-shot registration: creates an organisation, an owner user, the membership link, ' +
      'and an audit event in a single transaction. Sets the session cookie so the caller is ' +
      'immediately logged in.',
  })
  @ApiZodBody('SignUpBody', 'Owner credentials + organisation name.')
  @ApiInlineOk('Newly-created user with their initial owner membership.', {
    userId: 'cm0user123',
    email: 'owner@newshop.com',
    name: 'Owner Name',
    memberships: [{ id: '', organizationId: 'cm0org123', role: 'owner' }],
  })
  @ApiBadRequest('Email already registered.')
  async signUp(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const data = SignUpBody.parse(body);
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException('email already registered');

    const passwordHash = await this.auth.hashPassword(data.password);
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: data.organizationName,
          status: 'onboarding',
        },
      });
      const user = await tx.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
        },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: org.id, role: 'owner' },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: org.id,
          actorUserId: user.id,
          action: 'organization.created',
          targetType: 'organization',
          targetId: org.id,
          metadata: { via: 'sign-up' },
        },
      });
      return { user, org };
    });

    const cookie = this.session.sign(result.user.id);
    this.setCookie(res, SESSION_COOKIE, cookie.value, cookie.maxAge);
    this.setCookie(res, 'jobab_org', result.org.id, cookie.maxAge);
    return {
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      memberships: [{ id: '', organizationId: result.org.id, role: 'owner' as const }],
    };
  }

  @Public()
  @Get('invites/inspect')
  @ApiOperation({
    summary: 'Preview an invite before accepting',
    description:
      'Used by the accept-invite landing page to show "Join {Org} as {role}" without ' +
      'forcing the user to commit. Public — no session required.',
  })
  @ApiQuery({
    name: 'token',
    description: 'The invite token from the email link.',
    example: 'inv_abc123',
  })
  @ApiZodOk('InvitePreview', 'What the invite is for.')
  @ApiBadRequest('Invite invalid, already accepted, or expired.')
  async inspectInvite(@Req() req: Request) {
    const { token } = InspectInviteQuery.parse(req.query);
    const hash = this.session.hashInviteToken(token);
    const invite = await this.prisma.invite.findUnique({
      where: { tokenHash: hash },
      include: {
        organization: { select: { name: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('invite invalid or expired');
    }
    return {
      email: invite.email,
      role: invite.role,
      organizationName: invite.organization.name,
      invitedBy: invite.invitedBy.name ?? invite.invitedBy.email,
      expiresAt: invite.expiresAt.toISOString(),
    };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiAuthCookie()
  @ApiOperation({
    summary: 'Clear the session cookie',
    description: 'Idempotent. Always returns `{ ok: true }` even if no session existed.',
  })
  @ApiInlineOk('Cookies cleared.', { ok: true })
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    res.cookie('jobab_org', '', { httpOnly: true, path: '/', maxAge: 0 });
    return { ok: true };
  }

  @Get('me')
  @ApiAuthCookie()
  @ApiAuthErrors()
  @ApiOperation({
    summary: 'Current user + memberships',
    description:
      'Use this to bootstrap the dashboard: avatar, name, the list of orgs the user belongs ' +
      'to (so you can render an org switcher).',
  })
  @ApiInlineOk('User profile + memberships.', {
    userId: 'cm0user123',
    email: 'owner@shop.com',
    name: 'Owner Name',
    memberships: [{ id: 'cm0mem123', organizationId: 'cm0org123', role: 'owner' }],
  })
  async me(@Req() req: Request) {
    const cookie = req.cookies?.[SESSION_COOKIE];
    const user = await this.auth.loadFromSession(cookie);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('active-org')
  @HttpCode(200)
  @ApiAuthCookie()
  @ApiAuthErrors()
  @ApiOperation({
    summary: 'Switch the active organisation',
    description:
      'Updates the `jobab_org` cookie. The next request will be scoped to the new org. ' +
      'Returns `400` if you are not a member of that org.',
  })
  @ApiZodBody('SetActiveOrgBody', 'Org you want to switch to.')
  @ApiInlineOk('Org switched.', { ok: true, organizationId: 'cm0org123' })
  @ApiBadRequest('You are not a member of that organisation.')
  async setActiveOrg(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { organizationId } = SetActiveOrgBody.parse(body);
    const cookie = req.cookies?.[SESSION_COOKIE];
    const user = await this.auth.loadFromSession(cookie);
    if (!user) throw new UnauthorizedException();
    if (!user.memberships.some((m) => m.organizationId === organizationId)) {
      throw new BadRequestException('not a member of that organization');
    }
    this.setCookie(res, 'jobab_org', organizationId, 60 * 60 * 24 * 14);
    return { ok: true, organizationId };
  }

  @Public()
  @Post('accept-invite')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Accept an org invite and create / update the user',
    description:
      'If the invitee already has an account we update its name + password; otherwise we ' +
      'create one. Either way we attach them to the org with the role from the invite and ' +
      'log them in (session cookie set).',
  })
  @ApiZodBody('AcceptInviteBody', 'Invite token + the new account credentials.')
  @ApiInlineOk('Invite accepted, session set.', { ok: true })
  @ApiBadRequest('Invite invalid, expired, or already accepted.')
  async acceptInvite(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const { token, name, password } = AcceptInviteBody.parse(body);
    const hash = this.session.hashInviteToken(token);
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash: hash } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('invite invalid or expired');
    }

    const passwordHash = await this.auth.hashPassword(password);
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { email: invite.email.toLowerCase() } });
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name, passwordHash },
          })
        : await tx.user.create({
            data: { email: invite.email.toLowerCase(), name, passwordHash },
          });
      await tx.membership.upsert({
        where: {
          userId_organizationId: { userId: user.id, organizationId: invite.organizationId },
        },
        update: { role: invite.role },
        create: { userId: user.id, organizationId: invite.organizationId, role: invite.role },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: invite.organizationId,
          actorUserId: user.id,
          action: 'member.joined',
          targetType: 'user',
          targetId: user.id,
          metadata: { role: invite.role, via: 'invite' },
        },
      });
      return user;
    });

    const cookie = this.session.sign(result.id);
    this.setCookie(res, SESSION_COOKIE, cookie.value, cookie.maxAge);
    this.setCookie(res, 'jobab_org', invite.organizationId, cookie.maxAge);
    return { ok: true };
  }

  private setCookie(res: Response, name: string, value: string, maxAgeSeconds: number) {
    res.cookie(name, value, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.get('NODE_ENV') === 'production',
      path: '/',
      maxAge: maxAgeSeconds * 1000,
    });
  }
}
