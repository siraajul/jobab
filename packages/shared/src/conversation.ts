import { z } from 'zod';
import { ConversationStatusSchema, HandoffCategorySchema } from './enums';
import { MessageSchema } from './message';
import { OrderSchema } from './order';

export const ConversationSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  externalUserId: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  customerAddress: z.string().nullable(),
  assignedUserId: z.string().nullable().optional(),
  status: ConversationStatusSchema,
  handoffCategory: HandoffCategorySchema.nullable().optional(),
  handoffReason: z.string().nullable().optional(),
  lastCustomerMessageAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

const ConversationPageSchema = z
  .object({ id: z.string(), externalPageId: z.string(), platform: z.string() })
  .optional();

// The eight palette colours a tag chip can take. Kept in sync with the
// web `TagChip` colour map.
export const TagColorSchema = z.enum([
  'slate',
  'red',
  'amber',
  'green',
  'blue',
  'purple',
  'pink',
  'teal',
]);
export type TagColor = z.infer<typeof TagColorSchema>;

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  createdAt: z.string().optional(),
});
export type Tag = z.infer<typeof TagSchema>;

// On a conversation a tag is the flat label (the join row is mapped away by
// the API), so it's just the tag without `createdAt`.
export const ConversationTagSchema = TagSchema.pick({ id: true, name: true, color: true });
export type ConversationTag = z.infer<typeof ConversationTagSchema>;

export const CreateTagBodySchema = z.object({
  name: z.string().min(1).max(40),
  color: TagColorSchema.optional(),
});
export type CreateTagBody = z.infer<typeof CreateTagBodySchema>;

export const UpdateTagBodySchema = z.object({
  name: z.string().min(1).max(40).optional(),
  color: TagColorSchema.optional(),
});
export type UpdateTagBody = z.infer<typeof UpdateTagBodySchema>;

export const NoteSchema = z.object({
  id: z.string(),
  body: z.string(),
  authorName: z.string().nullable(),
  createdAt: z.string(),
});
export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteBodySchema = z.object({
  body: z.string().min(1).max(4000),
});
export type CreateNoteBody = z.infer<typeof CreateNoteBodySchema>;

export const ConversationListItemSchema = ConversationSchema.extend({
  page: ConversationPageSchema,
  tags: z.array(ConversationTagSchema).optional(),
  messages: z.array(
    MessageSchema.pick({ id: true, content: true, sender: true, createdAt: true }),
  ),
});
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;

export const ConversationDetailSchema = ConversationSchema.extend({
  page: ConversationPageSchema,
  tags: z.array(ConversationTagSchema).optional(),
  messages: z.array(MessageSchema),
  orders: z.array(OrderSchema),
});
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;

/** A single AI agent run on a conversation — the source for the activity feed.
 *  `toolCalls` mirrors what the worker persisted: an array of executed tools. */
export const AgentRunToolCallSchema = z.object({
  name: z.string(),
  arguments: z.unknown().optional(),
  result: z.unknown().optional(),
  error: z.string().nullable().optional(),
});
export type AgentRunToolCall = z.infer<typeof AgentRunToolCallSchema>;

export const ConversationActivityItemSchema = z.object({
  id: z.string(),
  model: z.string(),
  inputTokens: z.number(),
  outputTokens: z.number(),
  costUsd: z.union([z.number(), z.string()]),
  latencyMs: z.number(),
  toolCalls: z.array(AgentRunToolCallSchema).nullable(),
  createdAt: z.string(),
});
export type ConversationActivityItem = z.infer<typeof ConversationActivityItemSchema>;

export const SendReplyBodySchema = z.object({
  text: z.string().min(1).max(4000),
});
export type SendReplyBody = z.infer<typeof SendReplyBodySchema>;
