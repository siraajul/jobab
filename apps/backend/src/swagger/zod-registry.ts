/**
 * Bridge from `@jobab/shared` Zod schemas to OpenAPI `components/schemas`.
 *
 * Why this file exists:
 *  - the shared package is the single source of truth for every request/response shape
 *  - hand-mirroring schemas into Swagger decorators rots the moment Zod changes
 *  - `zod-to-openapi` lets us register a Zod schema once and reference it by name
 *    from any controller via `$ref: '#/components/schemas/<Name>'`
 *
 * For new contributors: if you add a new Zod schema in `@jobab/shared`, register
 * it below with a short, beginner-friendly description. Then in your controller
 * use `ApiZodBody('Name')` or `ApiZodOk('Name')` — no manual JSON-schema needed.
 */
import 'reflect-metadata';
import { OpenAPIRegistry, extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  // auth
  LoginBodySchema,
  SignUpBodySchema,
  AcceptInviteBodySchema,
  InvitePreviewSchema,
  // analytics
  AnalyticsSummarySchema,
  // conversations
  ConversationSchema,
  ConversationListItemSchema,
  ConversationDetailSchema,
  ConversationActivityItemSchema,
  SendReplyBodySchema,
  TagSchema,
  CreateTagBodySchema,
  UpdateTagBodySchema,
  NoteSchema,
  CreateNoteBodySchema,
  // orders
  OrderSchema,
  OrderListItemSchema,
  SetOrderStatusBodySchema,
  // products
  ProductSchema,
  ProductVariantSchema,
  CsvSyncBodySchema,
  ShopifySyncBodySchema,
  WooSyncBodySchema,
  SetVariantStockBodySchema,
  // onboarding
  OnboardingStatusSchema,
  ConnectPageBodySchema,
  // settings
  SettingsPayloadSchema,
  UpdateSettingsBodySchema,
  // webhooks
  FakeMessageBodySchema,
} from '@jobab/shared';

// Add `.openapi()` to all Zod schemas (idempotent — safe to call once at boot).
extendZodWithOpenApi(z);

export const zodRegistry = new OpenAPIRegistry();

/**
 * Register a Zod schema under a name so it shows up in `components/schemas`
 * and can be referenced via `$ref` from any operation.
 *
 * Returns the registered Zod schema so callers can chain off it if needed.
 */
function reg<T extends z.ZodTypeAny>(name: string, schema: T, description?: string): T {
  // `as unknown as T` avoids the generic-erasure dance — the schema is the same
  // object at runtime; only the OpenAPI metadata is added.
  return zodRegistry.register(name, schema.openapi(name, { description })) as unknown as T;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
reg('LoginBody', LoginBodySchema, 'Email + password to start a session.');
reg(
  'SignUpBody',
  SignUpBodySchema,
  'Create a new organisation and its first owner account in one call.',
);
reg(
  'AcceptInviteBody',
  AcceptInviteBodySchema,
  'Join an existing organisation using a one-time invite token.',
);
reg(
  'InvitePreview',
  InvitePreviewSchema,
  'Light-weight preview of an invite (org name, inviter, role) before accepting.',
);

// ---------------------------------------------------------------------------
// Conversations · tags · notes
// ---------------------------------------------------------------------------
reg('Conversation', ConversationSchema, 'A single customer conversation across any channel.');
reg(
  'ConversationListItem',
  ConversationListItemSchema,
  'Row shape returned by `GET /conversations` — the inbox list.',
);
reg(
  'ConversationDetail',
  ConversationDetailSchema,
  'Full conversation with messages, tags, and the live order if any.',
);
reg(
  'ConversationActivityItem',
  ConversationActivityItemSchema,
  'One entry in the AI activity feed (tool call, tokens, latency, cost).',
);
reg('SendReplyBody', SendReplyBodySchema, 'Plain-text reply sent by the merchant.');
reg('Tag', TagSchema, 'Colour-coded label (e.g. "Priority", "Top client") used to triage chats.');
reg('CreateTagBody', CreateTagBodySchema, 'Payload to create a new tag on the org.');
reg('UpdateTagBody', UpdateTagBodySchema, 'Rename or recolour an existing tag.');
reg('Note', NoteSchema, 'Internal note on a conversation — never shown to the customer.');
reg('CreateNoteBody', CreateNoteBodySchema, 'Add an internal note on a conversation.');

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------
reg('Order', OrderSchema, 'An order taken by the AI or merchant, with its lifecycle status.');
reg('OrderListItem', OrderListItemSchema, 'Row shape returned by `GET /orders`.');
reg('SetOrderStatusBody', SetOrderStatusBodySchema, 'Move an order through its lifecycle.');

// ---------------------------------------------------------------------------
// Catalog · products
// ---------------------------------------------------------------------------
reg('Product', ProductSchema, 'A product with one or more variants.');
reg(
  'ProductVariant',
  ProductVariantSchema,
  'A specific SKU of a product (size / colour / price / stock).',
);
reg('CsvSyncBody', CsvSyncBodySchema, 'Import products from a CSV blob.');
reg('ShopifySyncBody', ShopifySyncBodySchema, 'Sync products from a Shopify store.');
reg('WooSyncBody', WooSyncBodySchema, 'Sync products from a WooCommerce store.');
reg('SetVariantStockBody', SetVariantStockBodySchema, 'Adjust live stock on a variant.');

// ---------------------------------------------------------------------------
// Onboarding · settings · analytics
// ---------------------------------------------------------------------------
reg(
  'OnboardingStatus',
  OnboardingStatusSchema,
  'Where the merchant is in the connect-pages → catalog → live flow.',
);
reg('ConnectPageBody', ConnectPageBodySchema, 'Connect a Facebook / Instagram / WhatsApp page.');
reg(
  'SettingsPayload',
  SettingsPayloadSchema,
  'Org settings — shop name, AI instructions, channels.',
);
reg('UpdateSettingsBody', UpdateSettingsBodySchema, 'Partial update to the settings payload.');
reg(
  'AnalyticsSummary',
  AnalyticsSummarySchema,
  'Dashboard analytics: conversations, revenue, tokens, latency, cost.',
);

// ---------------------------------------------------------------------------
// Webhooks
// ---------------------------------------------------------------------------
reg(
  'FakeMessageBody',
  FakeMessageBodySchema,
  'Dev-only: inject a fake customer DM through the full agent loop.',
);

// ---------------------------------------------------------------------------
// Generic error envelope — what every 4xx / 5xx looks like.
// (Not a Zod schema — defined directly so beginners can see the shape.)
// ---------------------------------------------------------------------------
zodRegistry.register(
  'ApiError',
  z
    .object({
      statusCode: z.number().int().openapi({ example: 400, description: 'HTTP status code.' }),
      message: z.union([z.string(), z.array(z.string())]).openapi({
        example: 'Validation failed',
        description: 'Human-readable error, or a list of validation issues.',
      }),
      error: z
        .string()
        .optional()
        .openapi({ example: 'Bad Request', description: 'Short error name.' }),
    })
    .openapi('ApiError', { description: 'Standard error envelope returned by every endpoint.' }),
);
