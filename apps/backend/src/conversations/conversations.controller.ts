import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { CreateNoteBodySchema, SendReplyBodySchema } from '@jobab/shared';
import { CurrentUser, OrgId, type AuthenticatedContext } from '../auth/auth.guard';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiNotFound,
  ApiZodBody,
  ApiZodOk,
  ApiZodOkArray,
} from '../swagger/decorators';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List recent conversations for the active org',
    description:
      'Returns the inbox rows: last message snippet, unread / waiting state, channel badge, ' +
      'and tag chips. Use this to render the conversation list on the left of the dashboard.',
  })
  @ApiZodOkArray('ConversationListItem', 'Inbox rows, newest activity first.')
  list(@OrgId() orgId: string) {
    return this.svc.list(orgId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single conversation with its messages and active order',
    description:
      'Hydrates one conversation — the last ~50 messages, attached tags, internal notes, and ' +
      'the live order (if the AI is assembling one). Open this when the user clicks a row.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID (cuid).', example: 'cm0abc123def' })
  @ApiZodOk('ConversationDetail', 'Full conversation payload.')
  @ApiNotFound('Conversation')
  detail(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.detail(orgId, id);
  }

  @Get(':id/messages/older')
  @ApiOperation({
    summary: 'Paginate older messages in a conversation',
    description:
      'Cursor pagination using the timestamp of the oldest message you already have. ' +
      'Pass that ISO string as `before` and the server returns up to `limit` older messages.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.', example: 'cm0abc123def' })
  @ApiQuery({
    name: 'before',
    description:
      'ISO-8601 timestamp of the oldest message you already have. Older than this is returned.',
    example: '2026-05-30T03:11:00.000Z',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Max messages to return (default 50).',
    required: false,
    example: 50,
  })
  older(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('before') before: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.olderMessages(orgId, id, before, limit ? Number(limit) : 50);
  }

  @Get(':id/activity')
  @ApiOperation({
    summary: 'AI agent activity feed for a conversation',
    description:
      'One entry per agent run — the tools the AI called, tokens consumed, latency, and cost. ' +
      'Powers the right-rail Activity panel and is invaluable when debugging odd AI behaviour.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiQuery({
    name: 'limit',
    description: 'Max activity entries (default 50).',
    required: false,
    example: 50,
  })
  @ApiZodOkArray('ConversationActivityItem', 'Most recent runs first.')
  activity(@OrgId() orgId: string, @Param('id') id: string, @Query('limit') limit?: string) {
    return this.svc.activity(orgId, id, limit ? Number(limit) : 50);
  }

  @Post(':id/takeover')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Merchant takes over from the AI',
    description:
      'Flips the conversation to `human` status. The AI immediately stops replying for this thread — ' +
      'the next inbound message will sit waiting until the merchant replies or hands back.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodOk('Conversation', 'The conversation, now in `human` status.')
  @ApiNotFound('Conversation')
  takeover(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.takeOver(orgId, id);
  }

  @Post(':id/hand-back')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Hand the conversation back to the AI',
    description:
      'Flips the conversation from `human` back to `bot`. The AI resumes on the next inbound message.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodOk('Conversation', 'The conversation, now in `bot` status.')
  @ApiNotFound('Conversation')
  handBack(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.handBack(orgId, id);
  }

  @Post(':id/reply')
  @ApiOperation({
    summary: 'Send a merchant reply',
    description:
      "Send a plain-text message as the merchant. The message is delivered via the customer's " +
      'channel (Facebook / Instagram / WhatsApp) and appended to the thread with `sender = "human"`.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodBody('SendReplyBody', 'The text to send. Max 4 000 chars.')
  @ApiZodOk('Conversation', 'Conversation with the new message appended.')
  @ApiNotFound('Conversation')
  reply(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { text } = SendReplyBodySchema.parse(body);
    return this.svc.sendMerchantReply(orgId, id, text);
  }

  @Post(':id/assert-product')
  @ApiOperation({
    summary: 'Confirm an image-match candidate',
    description:
      'When a customer sends a product photo the AI returns ranked candidates instead of ' +
      'guessing. The merchant clicks the right one and we POST here; the AI continues with ' +
      'grounded info about that product.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodOk('Conversation', "Conversation, with the AI's grounded follow-up appended.")
  @ApiNotFound('Conversation')
  assertProduct(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { productId } = AssertProductBody.parse(body);
    return this.svc.assertProduct(orgId, id, productId);
  }

  @Post(':id/tags')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Attach a tag to the conversation',
    description: 'Tags must already exist in the org — create them via `POST /tags`.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodOk('Conversation', 'Conversation with the tag now attached.')
  @ApiNotFound('Conversation or tag')
  addTag(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { tagId } = AddTagBody.parse(body);
    return this.svc.addTag(orgId, id, tagId);
  }

  @Delete(':id/tags/:tagId')
  @ApiOperation({ summary: 'Remove a tag from the conversation' })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiParam({ name: 'tagId', description: 'Tag ID to remove.' })
  @ApiZodOk('Conversation', 'Conversation without that tag.')
  @ApiNotFound('Conversation or tag')
  removeTag(@OrgId() orgId: string, @Param('id') id: string, @Param('tagId') tagId: string) {
    return this.svc.removeTag(orgId, id, tagId);
  }

  @Get(':id/notes')
  @ApiOperation({
    summary: 'Internal notes on a conversation',
    description: 'Notes are visible only to merchant team-mates — never shown to the customer.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodOkArray('Note', 'Notes, newest first.')
  @ApiNotFound('Conversation')
  listNotes(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.listNotes(orgId, id);
  }

  @Post(':id/notes')
  @ApiOperation({
    summary: 'Add an internal note',
    description: 'Pinned to the conversation for the whole team. Markdown allowed.',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiZodBody('CreateNoteBody', 'Note body (max 4 000 chars).')
  @ApiZodOk('Note', 'The newly-created note.')
  @ApiNotFound('Conversation')
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
  @ApiParam({ name: 'id', description: 'Conversation ID.' })
  @ApiParam({ name: 'noteId', description: 'Note ID to delete.' })
  @ApiZodOk('Note', 'The deleted note (for optimistic UI removal).')
  @ApiNotFound('Conversation or note')
  deleteNote(@OrgId() orgId: string, @Param('id') id: string, @Param('noteId') noteId: string) {
    return this.svc.deleteNote(orgId, id, noteId);
  }
}

const AssertProductBody = z.object({ productId: z.string().min(1) });
const AddTagBody = z.object({ tagId: z.string().min(1) });
