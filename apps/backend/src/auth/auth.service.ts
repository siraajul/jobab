import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from './session.service';

const BCRYPT_COST = 11;

export interface AuthenticatedContext {
  userId: string;
  email: string;
  name: string | null;
  memberships: Array<{
    id: string;
    organizationId: string;
    role: MemberRole;
  }>;
}

export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
}

export interface AcceptInviteInput {
  token: string;
  name: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
  ) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_COST);
  }

  async verifyPassword(plaintext: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plaintext, hash);
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ user: AuthenticatedContext; cookie: { value: string; maxAge: number } }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { memberships: { include: { organization: { select: { id: true } } } } },
    });
    if (!user || !user.passwordHash) throw new UnauthorizedException('invalid credentials');
    const ok = await this.verifyPassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    const cookie = this.session.sign(user.id);
    return {
      user: this.toAuthContext(user),
      cookie,
    };
  }

  async loadFromSession(cookieValue: string | undefined): Promise<AuthenticatedContext | null> {
    const payload = this.session.verify(cookieValue);
    if (!payload) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: payload.uid },
      include: { memberships: { include: { organization: { select: { id: true } } } } },
    });
    if (!user) return null;
    return this.toAuthContext(user);
  }

  /**
   * Create an organisation + owner user + membership + audit row in one
   * transaction, then sign a session cookie for the new user. Throws if the
   * email is already registered.
   */
  async signUp(input: SignUpInput): Promise<{
    user: AuthenticatedContext;
    organizationId: string;
    cookie: { value: string; maxAge: number };
  }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });
    if (existing) throw new BadRequestException('email already registered');

    const passwordHash = await this.hashPassword(input.password);
    const result = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName, status: 'onboarding' },
      });
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash,
        },
      });
      const membership = await tx.membership.create({
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
      return { user, org, membership };
    });

    const cookie = this.session.sign(result.user.id);
    return {
      user: {
        userId: result.user.id,
        email: result.user.email,
        name: result.user.name,
        memberships: [{ id: result.membership.id, organizationId: result.org.id, role: 'owner' }],
      },
      organizationId: result.org.id,
      cookie,
    };
  }

  /**
   * Look up a pending invite by its raw token. Returns the preview the
   * accept-invite landing page renders. Throws if the invite is invalid,
   * already accepted, or expired.
   */
  async inspectInvite(token: string) {
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

  /**
   * Redeem an invite. Updates an existing user or creates a fresh one, links
   * them to the inviting org with the role from the invite, marks the invite
   * accepted, and signs a session cookie.
   */
  async acceptInvite(input: AcceptInviteInput): Promise<{
    organizationId: string;
    cookie: { value: string; maxAge: number };
  }> {
    const hash = this.session.hashInviteToken(input.token);
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash: hash } });
    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new BadRequestException('invite invalid or expired');
    }

    const passwordHash = await this.hashPassword(input.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({
        where: { email: invite.email.toLowerCase() },
      });
      const u = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { name: input.name, passwordHash },
          })
        : await tx.user.create({
            data: { email: invite.email.toLowerCase(), name: input.name, passwordHash },
          });
      await tx.membership.upsert({
        where: {
          userId_organizationId: { userId: u.id, organizationId: invite.organizationId },
        },
        update: { role: invite.role },
        create: { userId: u.id, organizationId: invite.organizationId, role: invite.role },
      });
      await tx.invite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: invite.organizationId,
          actorUserId: u.id,
          action: 'member.joined',
          targetType: 'user',
          targetId: u.id,
          metadata: { role: invite.role, via: 'invite' },
        },
      });
      return u;
    });

    return {
      organizationId: invite.organizationId,
      cookie: this.session.sign(user.id),
    };
  }

  /**
   * Verify the user is a member of the target org before the controller flips
   * the `jobab_org` cookie. Throws 400 if not a member.
   */
  assertMembership(user: AuthenticatedContext, organizationId: string) {
    if (!user.memberships.some((m) => m.organizationId === organizationId)) {
      throw new BadRequestException('not a member of that organization');
    }
  }

  private toAuthContext(user: {
    id: string;
    email: string;
    name: string | null;
    memberships: Array<{ id: string; organizationId: string; role: MemberRole }>;
  }): AuthenticatedContext {
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      memberships: user.memberships.map((m) => ({
        id: m.id,
        organizationId: m.organizationId,
        role: m.role,
      })),
    };
  }
}
