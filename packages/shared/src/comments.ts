import { z } from 'zod';

export const CommentIntentSchema = z.enum(['price', 'buy', 'question', 'other', 'spam']);
export type CommentIntent = z.infer<typeof CommentIntentSchema>;

export const CommentReplyModeSchema = z.enum(['ai', 'manual', 'off']);
export type CommentReplyMode = z.infer<typeof CommentReplyModeSchema>;

export const CommentPrivateReplyRefSchema = z.object({
  id: z.string(),
  externalUserId: z.string(),
  customerName: z.string().nullable(),
});

export const CommentRowSchema = z.object({
  id: z.string(),
  postId: z.string(),
  commenterName: z.string().nullable(),
  content: z.string(),
  intent: CommentIntentSchema.nullable(),
  intentConfidence: z.number().nullable(),
  publicReplySent: z.boolean(),
  publicReplyText: z.string().nullable(),
  privateReplySent: z.boolean(),
  privateReply: CommentPrivateReplyRefSchema.nullable(),
  createdAt: z.string(),
});
export type CommentRow = z.infer<typeof CommentRowSchema>;

export const CommentRuleSchema = z.object({
  intent: CommentIntentSchema,
  replyMode: CommentReplyModeSchema,
  publicTemplate: z.string().nullable(),
  privateAllowed: z.boolean(),
});
export type CommentRule = z.infer<typeof CommentRuleSchema>;

export const UpdateCommentRuleBodySchema = z.object({
  replyMode: CommentReplyModeSchema.optional(),
  publicTemplate: z.string().max(500).nullable().optional(),
  privateAllowed: z.boolean().optional(),
});
export type UpdateCommentRuleBody = z.infer<typeof UpdateCommentRuleBodySchema>;
