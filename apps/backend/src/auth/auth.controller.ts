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
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';
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
  @ApiOperation({ summary: 'Log in with email + password' })
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
  @ApiOperation({ summary: 'Create a new organization with an owner account' })
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
  @ApiOperation({ summary: 'Preview an invite (returns org name + role) before accepting' })
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
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response) {
    res.cookie(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    res.cookie('jobab_org', '', { httpOnly: true, path: '/', maxAge: 0 });
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Current user + memberships' })
  async me(@Req() req: Request) {
    const cookie = req.cookies?.[SESSION_COOKIE];
    const user = await this.auth.loadFromSession(cookie);
    if (!user) throw new UnauthorizedException();
    return user;
  }

  @Post('active-org')
  @HttpCode(200)
  @ApiOperation({ summary: 'Switch the active organization (must be a member)' })
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
  @ApiOperation({ summary: 'Create a user account by accepting an invite' })
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
