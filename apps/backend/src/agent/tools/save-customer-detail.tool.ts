import { z } from 'zod';
import { Tool, ToolContext } from './types';

const Input = z.object({
  field: z.enum(['name', 'phone', 'address']),
  value: z.string().min(1).max(500),
});

export const saveCustomerDetailTool: Tool = {
  definition: {
    name: 'save_customer_detail',
    description:
      'Persist a single customer detail extracted from the conversation. Used to fill the order guardrail required fields (name, phone, address).',
    parameters: {
      type: 'object',
      properties: {
        field: { type: 'string', enum: ['name', 'phone', 'address'] },
        value: { type: 'string' },
      },
      required: ['field', 'value'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { field, value } = Input.parse(input);

    // Guardrail: the value must appear in a recent customer message (last 20).
    // Catches the model inventing addresses / phone numbers / names.
    const recentCustomerMessages = await ctx.prisma.message.findMany({
      where: { conversationId: ctx.conversationId, sender: 'customer' },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { content: true },
    });
    const blob = recentCustomerMessages.map((m) => m.content.toLowerCase()).join('\n');
    const needle = value.toLowerCase();
    // Allow any substring of length >= 4 from the value to match — handles
    // light reformatting ("01713-456789" → "01713 456789").
    const normalized = needle.replace(/[^\p{L}\p{N}]+/gu, '');
    const blobNormalized = blob.replace(/[^\p{L}\p{N}]+/gu, '');
    const grounded =
      blob.includes(needle) ||
      (normalized.length >= 4 && blobNormalized.includes(normalized));
    if (!grounded) {
      return {
        ok: false,
        error: 'not_grounded_in_conversation',
        hint: `The customer has not provided a ${field} matching "${value}". Ask them directly.`,
      };
    }

    const column = (
      { name: 'customerName', phone: 'customerPhone', address: 'customerAddress' } as const
    )[field];
    await ctx.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { [column]: value },
    });
    return { ok: true };
  },
};
