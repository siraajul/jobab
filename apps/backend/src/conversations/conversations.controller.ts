import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateNoteBodySchema, SendReplyBodySchema } from '@jobab/shared';
import { CurrentUser, OrgId, type AuthenticatedContext } from '../auth/auth.guard';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent conversations for the org' })
  list(@OrgId() orgId: string) {
    return this.svc.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single conversation with its messages and active order' })
  detail(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.detail(orgId, id);
  }

  @Get(':id/messages/older')
  @ApiOperation({ summary: 'Paginated older messages (cursor: before createdAt)' })
  older(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('before') before: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.olderMessages(orgId, id, before, limit ? Number(limit) : 50);
  }

  @Get(':id/activity')
  @ApiOperation({ summary: 'AI agent runs for a conversation (activity feed)' })
  activity(@OrgId() orgId: string, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.activity(orgId, id, limit ? Number(limit) : 50);
  }

  @Post(':id/takeover')
  @HttpCode(200)
  @ApiOperation({ summary: 'Merchant takes over from the AI' })
  takeover(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.takeOver(orgId, id);
  }

  @Post(':id/hand-back')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hand the conversation back to the AI' })
  handBack(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.handBack(orgId, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Send a merchant reply' })
  reply(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { text } = SendReplyBodySchema.parse(body);
    return this.svc.sendMerchantReply(orgId, id, text);
  }

  @Post(':id/assert-product')
  @ApiOperation({ summary: 'Merchant confirms an image-match candidate; the AI will reply with grounded info' })
  assertProduct(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { productId } = AssertProductBody.parse(body);
    return this.svc.assertProduct(orgId, id, productId);
  }

  @Post(':id/tags')
  @HttpCode(200)
  @ApiOperation({ summary: 'Apply a tag to the conversation' })
  addTag(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { tagId } = AddTagBody.parse(body);
    return this.svc.addTag(orgId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag from the conversation' })
  removeTag(@OrgId() orgId: string, @Param('id') id: string, @Param('tagId') tagId: string) {
    return this.svc.removeTag(orgId, id, tagId);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Internal merchant notes on the conversation' })
  listNotes(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.listNotes(orgId, id);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add an internal note' })
  addNote(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedContext,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    const { body: text } = CreateNoteBodySchema.parse(body);
    return this.svc.addNote(orgId, id, user.userId, text);
  }

  @Delete(':id/notes/:noteId')
  @ApiOperation({ summary: 'Delete an internal note' })
  deleteNote(@OrgId() orgId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.svc.deleteNote(orgId, id, noteId);
  }
}

const AssertProductBody = z.object({ productId: z.string().min(1) });
const AddTagBody = z.object({ tagId: z.string().min(1) });
