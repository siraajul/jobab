import { z } from 'zod';
import { Tool, ToolContext } from './types';

const Input = z.object({
  product_id: z.string().min(1),
  variant_id: z.string().min(1),
});

export const checkStockTool: Tool = {
  definition: {
    name: 'check_stock',
    description: 'Live stock + price lookup for a specific product variant.',
    parameters: {
      type: 'object',
      properties: {
        product_id: { type: 'string' },
        variant_id: { type: 'string' },
      },
      required: ['product_id', 'variant_id'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { product_id, variant_id } = Input.parse(input);
    const variant = await ctx.prisma.productVariant.findFirst({
      where: { id: variant_id, productId: product_id, product: { organizationId: ctx.organizationId } },
    });
    if (!variant) return { in_stock: false, stock_qty: 0, price: 0, error: 'unknown_variant' };
    return {
      in_stock: variant.stockQty > 0,
      stock_qty: variant.stockQty,
      price: Number(variant.price),
    };
  },
};
