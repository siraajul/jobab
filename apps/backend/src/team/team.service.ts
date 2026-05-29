import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SessionService } from '../auth/session.service';
import { AuthService } from '../auth/auth.service';

const INVITE_TTL_DAYS = 7;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly session: SessionService,
    private readonly auth: AuthService,
  ) {}

  listMembers(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, email: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  listInvites(organizationId: string) {
    return this.prisma.invite.findMany({
      where: { organizationId, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createInvite(input: {
    organizationId: string;
    actorUserId: string;
    actorRole: MemberRole;
    email: string;
    role: MemberRole;
  }) {
    if (input.role === 'owner' && input.actorRole !== 'owner') {
      throw new ForbiddenException('only owners can invite other owners');
    }
    const { token, hash } = this.session.generateInviteToken();
    const invite = await this.prisma.invite.create({
      data: {
        organizationId: input.organizationId,
        email: input.email.toLowerCase(),
        role: input.role,
        tokenHash: hash,
        invitedById: input.actorUserId,
        expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000),
      },
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: 'member.invited',
        targetType: 'invite',
        targetId: invite.id,
        metadata: { email: input.email, role: input.role },
      },
    });
    return { invite, token };
  }

  async revokeInvite(organizationId: string, actorUserId: string, inviteId: string) {
    const inv = await this.prisma.invite.findFirst({
      where: { id: inviteId, organizationId },
    });
    if (!inv) throw new NotFoundException('invite not found');
    await this.prisma.invite.delete({ where: { id: inv.id } });
    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorUserId,
        action: 'member.invite_revoked',
        targetType: 'invite',
        targetId: inviteId,
      },
    });
    return { ok: true };
  }

  async removeMember(organizationId: string, actorUserId: string, actorRole: MemberRole, membershipId: string) {
    const m = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId },
      include: { user: true },
    });
    if (!m) throw new NotFoundException('member not found');
    if (m.role === 'owner' && actorRole !== 'owner') {
      throw new ForbiddenException('only owners can remove owners');
    }
    const ownerCount = await this.prisma.membership.count({
      where: { organizationId, role: 'owner' },
    });
    if (m.role === 'owner' && ownerCount <= 1) {
      throw new BadRequestException('cannot remove the last owner');
    }
    await this.prisma.membership.delete({ where: { id: m.id } });
    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorUserId,
        action: 'member.removed',
        targetType: 'user',
        targetId: m.userId,
        metadata: { email: m.user.email, role: m.role },
      },
    });
    return { ok: true };
  }

  async assignConversation(
    organizationId: string,
    actorUserId: string,
    conversationId: string,
    assigneeUserId: string | null,
  ) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
    });
    if (!conv) throw new NotFoundException('conversation not found');

    if (assigneeUserId) {
      const member = await this.prisma.membership.findFirst({
        where: { organizationId, userId: assigneeUserId },
      });
      if (!member) throw new BadRequestException('assignee is not a member of this org');
    }

    const updated = await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedUserId: assigneeUserId },
    });
    await this.prisma.auditEvent.create({
      data: {
        organizationId,
        actorUserId,
        action: 'conversation.assigned',
        targetType: 'conversation',
        targetId: conversationId,
        metadata: { assigneeUserId },
      },
    });
    return updated;
  }
}
