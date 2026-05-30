import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CommentIntent, CommentReplyMode } from '@prisma/client';
import { OrgId, Roles } from '../auth/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiInlineOk,
  ApiNotFound,
  ApiZodBody,
} from '../swagger/decorators';

const UpdateRuleBody = z.object({
  replyMode: z.enum(['ai', 'manual', 'off']).optional(),
  publicTemplate: z.string().max(500).nullable().optional(),
  privateAllowed: z.boolean().optional(),
});

@ApiTags('comments')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('comments')
export class CommentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: 'List recent post comments captured for the active org',
    description:
      'Up to 200 most-recent comments across Facebook + Instagram posts the org is subscribed to. ' +
      'Optionally filter by intent (e.g. `price_ask`, `complaint`) or a specific post.',
  })
  @ApiQuery({
    name: 'intent',
    description: 'Filter by detected comment intent.',
    required: false,
    enum: ['greeting', 'price_ask', 'product_ask', 'complaint', 'other'],
  })
  @ApiQuery({
    name: 'postId',
    description: 'Filter to comments on a single post.',
    required: false,
  })
  @ApiInlineOk('Comments, newest first.', [
    {
      id: 'cm0com1',
      postId: 'post_123',
      text: 'price koto?',
      intent: 'price_ask',
      replyMode: 'ai',
      createdAt: '2026-05-30T03:00:00.000Z',
      privateReply: { id: 'cm0pr1', externalUserId: 'fb_42', customerName: 'Tahmina' },
    },
  ])
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
  @ApiOperation({
    summary: 'List per-intent comment automation rules',
    description:
      'One rule per intent. Each rule says whether the AI replies automatically, whether the bot ' +
      'may DM the commenter privately, and the public template (if any).',
  })
  @ApiInlineOk('Rule rows.', [
    {
      intent: 'price_ask',
      replyMode: 'ai',
      publicTemplate: 'Inbox check kore dilam 🙏',
      privateAllowed: true,
    },
  ])
  rules(@OrgId() orgId: string) {
    return this.prisma.commentRule.findMany({
      where: { organizationId: orgId },
      orderBy: { intent: 'asc' },
    });
  }

  @Patch('rules/:intent')
  @ApiOperation({
    summary: 'Update a comment rule (owner / admin only)',
    description:
      'Upserts — if the rule does not yet exist for that intent it is created with sensible ' +
      'defaults. Use `replyMode: "off"` to silence automation for that intent.',
  })
  @Roles('owner', 'admin')
  @ApiParam({
    name: 'intent',
    description: 'The intent to configure.',
    enum: ['greeting', 'price_ask', 'product_ask', 'complaint', 'other'],
  })
  @ApiZodBody('UpdateCommentRuleBody', 'Partial patch.')
  @ApiInlineOk('Updated rule.', {
    intent: 'price_ask',
    replyMode: 'manual',
    publicTemplate: null,
    privateAllowed: true,
  })
  @ApiNotFound('Comment rule')
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
