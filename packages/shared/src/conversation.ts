import { z } from 'zod';
import { ConversationStatusSchema } from './enums';
import { MessageSchema } from './message';
import { OrderSchema } from './order';

export const ConversationSchema = z.object({
  id: z.string(),
  pageId: z.string(),
  externalUserId: z.string(),
  customerName: z.string().nullable(),
  customerPhone: z.string().nullable(),
  customerAddress: z.string().nullable(),
  status: ConversationStatusSchema,
  lastCustomerMessageAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Conversation = z.infer<typeof ConversationSchema>;

export const ConversationListItemSchema = ConversationSchema.extend({
  page: z
    .object({ id: z.string(), externalPageId: z.string(), platform: z.string() })
    .optional(),
  messages: z.array(
    MessageSchema.pick({ id: true, content: true, sender: true, createdAt: true }),
  ),
});
export type ConversationListItem = z.infer<typeof ConversationListItemSchema>;

export const ConversationDetailSchema = ConversationSchema.extend({
  messages: z.array(MessageSchema),
  orders: z.array(OrderSchema),
});
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>;

export const SendReplyBodySchema = z.object({
  text: z.string().min(1).max(4000),
});
export type SendReplyBody = z.infer<typeof SendReplyBodySchema>;
