import { z } from 'zod';

export const ConversationStatusSchema = z.enum(['bot', 'needs_human', 'human', 'closed']);
export type ConversationStatus = z.infer<typeof ConversationStatusSchema>;

// Why a conversation was handed off. complaint/refund/payment_dispute are the
// "problem" categories that populate the dashboard Complaints section.
export const HandoffCategorySchema = z.enum([
  'complaint',
  'refund',
  'payment_dispute',
  'low_confidence',
  'asked_for_human',
  'other',
]);
export type HandoffCategory = z.infer<typeof HandoffCategorySchema>;

/** The three handoff categories that count as a customer "problem". */
export const PROBLEM_HANDOFF_CATEGORIES: HandoffCategory[] = [
  'complaint',
  'refund',
  'payment_dispute',
];

export const MessageSenderSchema = z.enum(['customer', 'agent', 'human']);
export type MessageSender = z.infer<typeof MessageSenderSchema>;

export const MessageDirectionSchema = z.enum(['in', 'out']);
export type MessageDirection = z.infer<typeof MessageDirectionSchema>;

export const OrderStatusSchema = z.enum(['created', 'confirmed', 'shipped', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof OrderStatusSchema>;

export const PaymentStatusSchema = z.enum(['pending', 'paid', 'failed']);
export type PaymentStatus = z.infer<typeof PaymentStatusSchema>;

export const PlatformSchema = z.enum(['facebook', 'instagram', 'whatsapp']);
export type Platform = z.infer<typeof PlatformSchema>;

export const PageStatusSchema = z.enum(['connected', 'error', 'disconnected']);
export type PageStatus = z.infer<typeof PageStatusSchema>;

export const CatalogSourceSchema = z.enum(['shopify', 'woocommerce', 'csv']);
export type CatalogSource = z.infer<typeof CatalogSourceSchema>;

export const OrgStatusSchema = z.enum(['onboarding', 'active', 'paused']);
export type OrgStatus = z.infer<typeof OrgStatusSchema>;

export const MemberRoleSchema = z.enum(['owner', 'admin', 'agent']);
export type MemberRole = z.infer<typeof MemberRoleSchema>;
