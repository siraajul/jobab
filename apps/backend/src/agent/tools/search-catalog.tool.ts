import { z } from 'zod';
import { Tool, ToolContext } from './types';

const Input = z.object({
  query: z.string().min(1),
});

export const searchCatalogTool: Tool = {
  definition: {
    name: 'search_catalog',
    description:
      "Search the organization's product catalog by free-text query (Bangla/Banglish/English ok). Returns up to 5 ranked products with their in-stock variants and current prices.",
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'What the customer is asking about.' },
      },
      required: ['query'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { query } = Input.parse(input);
    return ctx.catalog.search(ctx.organizationId, query, 5);
  },
};
