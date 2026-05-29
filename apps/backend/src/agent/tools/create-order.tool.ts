import { z } from 'zod';
import { Tool, ToolContext } from './types';

const Input = z.object({
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

/**
 * GUARDED tool (spec §6). The model proposes the items; the guardrail re-runs
 * stock + recomputes total + checks required customer fields, then either
 * creates the order or returns a structured error so the agent can ask for
 * the missing piece.
 */
export const createOrderTool: Tool = {
  definition: {
    name: 'create_order',
    description:
      'Propose order creation with the line items the customer has agreed to. The system re-verifies stock, recomputes the total, and confirms required customer fields (name, phone, address) before creating — never trust a model-stated price.',
    parameters: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              product_id: { type: 'string' },
              variant_id: { type: 'string' },
              qty: { type: 'integer', minimum: 1 },
            },
            required: ['product_id', 'variant_id', 'qty'],
            additionalProperties: false,
          },
        },
      },
      required: ['items'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { items } = Input.parse(input);
    return ctx.guardrail.tryCreate({
      organizationId: ctx.organizationId,
      conversationId: ctx.conversationId,
      proposedItems: items,
    });
  },
};
