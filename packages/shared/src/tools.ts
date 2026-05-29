import { z } from 'zod';

/** Tool input/output schemas — exposed so both the agent and any clients
 *  inspecting `agent_runs.tool_calls` can type the records correctly. */

export const SearchCatalogInputSchema = z.object({ query: z.string().min(1) });
export type SearchCatalogInput = z.infer<typeof SearchCatalogInputSchema>;

export const CheckStockInputSchema = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().min(1),
});
export type CheckStockInput = z.infer<typeof CheckStockInputSchema>;

export const SaveCustomerDetailInputSchema = z.object({
  field: z.enum(['name', 'phone', 'address']),
  value: z.string().min(1).max(500),
});
export type SaveCustomerDetailInput = z.infer<typeof SaveCustomerDetailInputSchema>;

export const CreateOrderInputSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().min(1),
        variant_id: z.string().min(1),
        qty: z.number().int().min(1),
      }),
    )
    .min(1),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

export const HandoffToHumanInputSchema = z.object({
  reason: z.string().min(1).max(500),
});
export type HandoffToHumanInput = z.infer<typeof HandoffToHumanInputSchema>;

export const MatchProductByImageInputSchema = z.object({
  image_url: z.string().url(),
});
export type MatchProductByImageInput = z.infer<typeof MatchProductByImageInputSchema>;

// Guardrail result, mirrored for the FE so it can render error chips.
export const CreateOrderResultSchema = z.union([
  z.object({
    ok: z.literal(true),
    order_id: z.string(),
    total: z.number(),
    currency: z.string(),
    payment_link: z.string().optional(),
  }),
  z.object({
    ok: z.literal(false),
    error: z.enum([
      'missing_customer_fields',
      'unknown_variant',
      'out_of_stock',
      'no_items',
      'duplicate_order',
    ]),
    missing_fields: z.array(z.enum(['name', 'phone', 'address'])).optional(),
    offending_variant_ids: z.array(z.string()).optional(),
    existing_order_id: z.string().optional(),
  }),
]);
export type CreateOrderResult = z.infer<typeof CreateOrderResultSchema>;
