import { z } from 'zod';

export const AnalyticsSummarySchema = z.object({
  range: z.object({ from: z.string(), to: z.string() }),
  conversations: z.object({
    total: z.number().int(),
    bot: z.number().int(),
    needs_human: z.number().int(),
    human: z.number().int(),
  }),
  messages: z.object({
    in: z.number().int(),
    out: z.number().int(),
  }),
  orders: z.object({
    count: z.number().int(),
    revenue: z.number(),
    currency: z.string(),
  }),
  agent: z.object({
    runs: z.number().int(),
    avgLatencyMs: z.number().int(),
    avgCostUsd: z.number(),
    totalCostUsd: z.number(),
    avgTokensIn: z.number().int(),
    avgTokensOut: z.number().int(),
  }),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;
