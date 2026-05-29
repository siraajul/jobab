import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AnalyticsSummary {
  range: { from: string; to: string };
  conversations: { total: number; bot: number; needs_human: number; human: number };
  messages: { in: number; out: number };
  orders: { count: number; revenue: number; currency: string };
  agent: {
    runs: number;
    avgLatencyMs: number;
    avgCostUsd: number;
    totalCostUsd: number;
    avgTokensIn: number;
    avgTokensOut: number;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string, days = 7): Promise<AnalyticsSummary> {
    const to = new Date();
    const from = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      convCounts,
      messageCounts,
      orderAgg,
      runAgg,
    ] = await Promise.all([
      this.prisma.conversation.groupBy({
        by: ['status'],
        where: { organizationId, createdAt: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.message.groupBy({
        by: ['direction'],
        where: { conversation: { organizationId }, createdAt: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.order.aggregate({
        where: { organizationId, createdAt: { gte: from }, status: { in: ['created', 'confirmed'] } },
        _count: { _all: true },
        _sum: { total: true },
      }),
      this.prisma.agentRun.aggregate({
        where: { conversation: { organizationId }, createdAt: { gte: from } },
        _count: { _all: true },
        _avg: { latencyMs: true, costUsd: true, inputTokens: true, outputTokens: true },
        _sum: { costUsd: true },
      }),
    ]);

    const byStatus = (s: string) =>
      convCounts.find((r) => r.status === s)?._count._all ?? 0;
    const byDirection = (d: string) =>
      messageCounts.find((r) => r.direction === d)?._count._all ?? 0;

    return {
      range: { from: from.toISOString(), to: to.toISOString() },
      conversations: {
        total: convCounts.reduce((acc, r) => acc + r._count._all, 0),
        bot: byStatus('bot'),
        needs_human: byStatus('needs_human'),
        human: byStatus('human'),
      },
      messages: { in: byDirection('in'), out: byDirection('out') },
      orders: {
        count: orderAgg._count._all,
        revenue: Number(orderAgg._sum.total ?? 0),
        currency: 'BDT',
      },
      agent: {
        runs: runAgg._count._all,
        avgLatencyMs: Math.round(runAgg._avg.latencyMs ?? 0),
        avgCostUsd: Number(runAgg._avg.costUsd ?? 0),
        totalCostUsd: Number(runAgg._sum.costUsd ?? 0),
        avgTokensIn: Math.round(runAgg._avg.inputTokens ?? 0),
        avgTokensOut: Math.round(runAgg._avg.outputTokens ?? 0),
      },
    };
  }
}
