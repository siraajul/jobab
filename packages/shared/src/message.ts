import { z } from 'zod';
import { MessageDirectionSchema, MessageSenderSchema } from './enums';

export const MatchCandidateSchema = z.object({
  product_id: z.string(),
  title: z.string(),
  score: z.number(),
  image_url: z.string().nullable().optional(),
});
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

export const MessageAttachmentsSchema = z.object({
  images: z.array(z.string()).optional(),
  candidates: z.array(MatchCandidateSchema).optional(),
  matchConfident: z.boolean().optional(),
});
export type MessageAttachments = z.infer<typeof MessageAttachmentsSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  direction: MessageDirectionSchema,
  sender: MessageSenderSchema,
  content: z.string(),
  attachments: MessageAttachmentsSchema.nullable().optional(),
  createdAt: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;
