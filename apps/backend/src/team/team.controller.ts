import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { MemberRole } from '@prisma/client';
import {
  CurrentMembership,
  CurrentUser,
  OrgId,
  Roles,
  type AuthenticatedContext,
} from '../auth/auth.guard';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiInlineOk,
  ApiNotFound,
  ApiZodBody,
} from '../swagger/decorators';
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
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('team')
export class TeamController {
  constructor(private readonly svc: TeamService) {}

  @Get('members')
  @ApiOperation({
    summary: 'List members of the active org',
    description: 'Returns every user with a membership in the active org, plus their role.',
  })
  @ApiInlineOk('Members array.', [
    { userId: 'cm0u1', name: 'Owner', email: 'owner@shop.com', role: 'owner' },
    { userId: 'cm0u2', name: 'Sales Agent', email: 'agent@shop.com', role: 'agent' },
  ])
  members(@OrgId() orgId: string) {
    return this.svc.listMembers(orgId);
  }

  @Get('invites')
  @ApiOperation({
    summary: 'List pending invites',
    description: 'Open invites for the active org. Owner / admin only.',
  })
  @Roles('owner', 'admin')
  @ApiInlineOk('Pending invites.', [
    { id: 'cm0inv1', email: 'new@shop.com', role: 'agent', expiresAt: '2026-06-06T00:00:00.000Z' },
  ])
  invites(@OrgId() orgId: string) {
    return this.svc.listInvites(orgId);
  }

  @Post('invites')
  @ApiOperation({
    summary: 'Send a new invite (owner / admin only)',
    description:
      'Returns the raw invite token **once** — the caller must share it out-of-band ' +
      '(email / Slack / WhatsApp). The database only stores its hash; we cannot show the ' +
      'token again afterwards.',
  })
  @Roles('owner', 'admin')
  @ApiZodBody('TeamInviteBody', 'Invitee email + role to assign on join.')
  @ApiInlineOk('Invite record + one-time token (share the token with the invitee).', {
    invite: {
      id: 'cm0inv1',
      email: 'new@shop.com',
      role: 'agent',
      expiresAt: '2026-06-06T00:00:00.000Z',
    },
    token: 'inv_2k3j4h5g6f7d8s9a',
  })
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
    return { invite, token };
  }

  @Delete('invites/:id')
  @ApiOperation({
    summary: 'Revoke a pending invite (owner / admin only)',
    description: 'Marks the invite as revoked so the token can no longer be redeemed.',
  })
  @Roles('owner', 'admin')
  @ApiParam({ name: 'id', description: 'Invite ID to revoke.' })
  @ApiInlineOk('Revoked.', { ok: true })
  @ApiNotFound('Invite')
  revokeInvite(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @Param('id') id: string,
  ) {
    return this.svc.revokeInvite(orgId, user.userId, id);
  }

  @Delete('members/:id')
  @ApiOperation({
    summary: 'Remove a member from the org (owner / admin only)',
    description:
      'Drops the membership row; the user keeps their account but loses access to this org.',
  })
  @Roles('owner', 'admin')
  @ApiParam({ name: 'id', description: 'Membership ID to remove.' })
  @ApiInlineOk('Removed.', { ok: true })
  @ApiNotFound('Member')
  removeMember(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @CurrentMembership() membership: AuthenticatedContext['memberships'][number],
    @Param('id') id: string,
  ) {
    return this.svc.removeMember(orgId, user.userId, membership.role, id);
  }

  @Patch('assign')
  @ApiOperation({
    summary: 'Assign (or un-assign) a conversation to a team member',
    description:
      'The assignee chip then renders on that conversation row. Pass `assigneeUserId: null` ' +
      'to clear the assignment.',
  })
  @ApiZodBody('AssignConversationBody', 'Which conversation, which user.')
  @ApiInlineOk('Assigned.', { ok: true, conversationId: 'cm0conv1', assigneeUserId: 'cm0u2' })
  @ApiNotFound('Conversation or user')
  assignConversation(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @Body() body: unknown,
  ) {
    const { conversationId, assigneeUserId } = AssignBody.parse(body);
    return this.svc.assignConversation(orgId, user.userId, conversationId, assigneeUserId);
  }
}
