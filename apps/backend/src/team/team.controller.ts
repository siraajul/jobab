import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MemberRole } from '@prisma/client';
import {
  CurrentMembership,
  CurrentUser,
  OrgId,
  Roles,
  type AuthenticatedContext,
} from '../auth/auth.guard';
import { TeamService } from './team.service';

const InviteBody = z.object({
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'agent']),
});

const AssignBody = z.object({
  conversationId: z.string().min(1),
  assigneeUserId: z.string().nullable(),
});

@ApiTags('team')
@Controller('team')
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  @Get('members')
  @ApiOperation({ summary: 'List members of the active org' })
  members(@OrgId() orgId: string) {
    return this.svc.listMembers(orgId);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List pending invites' })
  @Roles('owner', 'admin')
  invites(@OrgId() orgId: string) {
    return this.svc.listInvites(orgId);
  }

  @Post('invites')
  @ApiOperation({ summary: 'Create a new invite (owner/admin only)' })
  @Roles('owner', 'admin')
  async createInvite(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @CurrentMembership() membership: AuthenticatedContext['memberships'][number],
    @Body() body: unknown,
  ) {
    const parsed = InviteBody.parse(body);
    const { invite, token } = await this.svc.createInvite({
      organizationId: orgId,
      actorUserId: user.userId,
      actorRole: membership.role,
      email: parsed.email,
      role: parsed.role as MemberRole,
    });
    // The plain token is returned ONCE — the caller must share it with the
    // invitee (out-of-band: email/Slack/Whatsapp). DB only stores the hash.
    return { invite, token };
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke a pending invite' })
  @Roles('owner', 'admin')
  revokeInvite(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @Param('id') id: string,
  ) {
    return this.svc.revokeInvite(orgId, user.userId, id);
  }

  @Delete('members/:id')
  @ApiOperation({ summary: 'Remove a member from the org' })
  @Roles('owner', 'admin')
  removeMember(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @CurrentMembership() membership: AuthenticatedContext['memberships'][number],
    @Param('id') id: string,
  ) {
    return this.svc.removeMember(orgId, user.userId, membership.role, id);
  }

  @Patch('assign')
  @ApiOperation({ summary: 'Assign a conversation to a team member' })
  assignConversation(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @Body() body: unknown,
  ) {
    const { conversationId, assigneeUserId } = AssignBody.parse(body);
    return this.svc.assignConversation(orgId, user.userId, conversationId, assigneeUserId);
  }
}
