import { z } from 'zod';
import { ConversationStatus, HandoffCategory } from '@prisma/client';
import { Tool, ToolContext } from './types';

const CATEGORIES = [
  'complaint',
  'refund',
  'payment_dispute',
  'low_confidence',
  'asked_for_human',
  'other',
] as const;

const Input = z.object({
  category: z.enum(CATEGORIES),
  reason: z.string().min(1).max(500),
});

export const handoffToHumanTool: Tool = {
  definition: {
    name: 'handoff_to_human',
    description:
      'Mark the conversation as needing the merchant. Trigger on complaints, refunds, payment disputes, low confidence, or when the customer explicitly asks for a human. Always classify with `category`.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: [...CATEGORIES],
          description:
            'Why the handoff is happening: complaint (customer reports a problem or is unhappy), refund (return/refund request), payment_dispute, low_confidence (you cannot resolve it), asked_for_human, or other.',
        },
        reason: {
          type: 'string',
          description: 'One short sentence summarising the issue for the merchant.',
        },
      },
      required: ['category', 'reason'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { category, reason } = Input.parse(input);
    const conv = await ctx.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: {
        status: ConversationStatus.needs_human,
        handoffCategory: category as HandoffCategory,
        handoffReason: reason,
      },
      select: { id: true, customerName: true, externalUserId: true },
    });
    const who = conv.customerName ?? conv.externalUserId;
    const isProblem =
      category === 'complaint' || category === 'refund' || category === 'payment_dispute';
    // Best-effort merchant alert via WhatsApp + push.
    await ctx.whatsapp
      .notifyOrg(
        ctx.organizationId,
        `${isProblem ? '🔴' : '🟡'} ${who} needs you on Jobab — ${reason.slice(0, 80)}`,
      )
      .catch(() => undefined);
    return { ok: true, category, reason };
  },
};
