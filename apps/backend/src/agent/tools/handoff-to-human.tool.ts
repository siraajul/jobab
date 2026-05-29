import { z } from 'zod';
import { ConversationStatus } from '@prisma/client';
import { Tool, ToolContext } from './types';

const Input = z.object({
  reason: z.string().min(1).max(500),
});

export const handoffToHumanTool: Tool = {
  definition: {
    name: 'handoff_to_human',
    description:
      'Mark the conversation as needing the merchant. Trigger on complaints, refunds, payment disputes, low confidence, or when the customer explicitly asks for a human.',
    parameters: {
      type: 'object',
      properties: { reason: { type: 'string' } },
      required: ['reason'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { reason } = Input.parse(input);
    const conv = await ctx.prisma.conversation.update({
      where: { id: ctx.conversationId },
      data: { status: ConversationStatus.needs_human },
      select: { id: true, customerName: true, externalUserId: true },
    });
    const who = conv.customerName ?? conv.externalUserId;
    // Best-effort merchant alert via WhatsApp + push.
    await ctx.whatsapp
      .notifyOrg(ctx.organizationId, `🟡 ${who} needs you on Jobab — ${reason.slice(0, 80)}`)
      .catch(() => undefined);
    return { ok: true, reason };
  },
};
