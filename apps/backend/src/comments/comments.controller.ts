import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CommentIntent, CommentReplyMode } from '@prisma/client';
import { OrgId, Roles } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const UpdateRuleBody = z.object({
  replyMode: z.enum(['ai', 'manual', 'off']).optional(),
  publicTemplate: z.string().max(500).nullable().optional(),
  privateAllowed: z.boolean().optional(),
});

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List recent comments for the active org' })
  list(
    @OrgId() orgId: string,
    @Query('intent') intent?: CommentIntent,
    @Query('postId') postId?: string,
  ) {
    return this.prisma.comment.findMany({
      where: {
        organizationId: orgId,
        ...(intent ? { intent } : {}),
        ...(postId ? { postId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        privateReply: { select: { id: true, externalUserId: true, customerName: true } },
      },
    });
  }

  @Get('rules')
  @ApiOperation({ summary: 'List per-intent comment automation rules' })
  rules(@OrgId() orgId: string) {
    return this.prisma.commentRule.findMany({
      where: { organizationId: orgId },
      orderBy: { intent: 'asc' },
    });
  }

  @Patch('rules/:intent')
  @ApiOperation({ summary: 'Update a comment rule (owner/admin)' })
  @Roles('owner', 'admin')
  async updateRule(
    @OrgId() orgId: string,
    @Param('intent') intentParam: string,
    @Body() body: unknown,
  ) {
    const intent = intentParam as CommentIntent;
    const data = UpdateRuleBody.parse(body);
    return this.prisma.commentRule.upsert({
      where: { organizationId_intent: { organizationId: orgId, intent } },
      update: {
        replyMode: data.replyMode as CommentReplyMode | undefined,
        publicTemplate: data.publicTemplate ?? undefined,
        privateAllowed: data.privateAllowed,
      },
      create: {
        organizationId: orgId,
        intent,
        replyMode: (data.replyMode ?? 'ai') as CommentReplyMode,
        publicTemplate: data.publicTemplate ?? null,
        privateAllowed: data.privateAllowed ?? true,
      },
    });
  }
}
