import { z } from 'zod';
import { OrderStatusSchema, PaymentStatusSchema } from './enums';

export const OrderItemSchema = z.object({
  product_id: z.string(),
  variant_id: z.string(),
  qty: z.number().int().min(1),
  price: z.number().nonnegative(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string(),
  conversationId: z.string(),
  items: z.array(OrderItemSchema),
  customerName: z.string(),
  customerPhone: z.string(),
  customerAddress: z.string(),
  total: z.union([z.string(), z.number()]),
  currency: z.string(),
  paymentStatus: PaymentStatusSchema,
  paymentLink: z.string().nullable(),
  status: OrderStatusSchema,
  createdAt: z.string(),
});
export type Order = z.infer<typeof OrderSchema>;

export const OrderListItemSchema = OrderSchema.extend({
  conversation: z
    .object({
      id: z.string(),
      externalUserId: z.string(),
      customerName: z.string().nullable(),
    })
    .optional(),
});
export type OrderListItem = z.infer<typeof OrderListItemSchema>;

export const SetOrderStatusBodySchema = z.object({
  status: OrderStatusSchema,
  /** When set + status is `shipped`, the agent sends a tracking message to the customer. */
  notifyCustomer: z.boolean().optional(),
  /** Optional courier / tracking note to include in that message. */
  trackingNote: z.string().max(500).optional(),
});
export type SetOrderStatusBody = z.infer<typeof SetOrderStatusBodySchema>;
