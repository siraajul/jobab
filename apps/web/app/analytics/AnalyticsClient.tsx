'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { usePoll } from '@/lib/hooks/use-poll';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { AnalyticsSummary } from '@/lib/types';

const RANGES: Array<{ key: number; label: string }> = [
  { key: 1, label: 'Today' },
  { key: 7, label: '7d' },
  { key: 30, label: '30d' },
  { key: 90, label: '90d' },
];

export function AnalyticsClient({ initial }: { initial: AnalyticsSummary | null }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(initial);

  usePoll(
    async () => {
      try {
        setData(await api.analytics(days));
      } catch {
        /* offline */
      }
    },
    8000,
    [days],
  );

  return (
    <AppShell
      title="Analytics"
      subtitle={
        data ? `${formatRange(data.range.from)} → ${formatRange(data.range.to)}` : 'Loading…'
      }
      actions={
        <div className="flex flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={async () => {
                setDays(r.key);
                try {
                  setData(await api.analytics(r.key));
                } catch {}
              }}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-semibold transition',
                days === r.key ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {!data ? (
        <div className="text-ink-3">Loading analytics…</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <BigStat
            tone="accent"
            label="AI handled"
            value={data.conversations.bot}
            sublabel={`${pct(data.conversations.bot, data.conversations.total)}% of ${data.conversations.total} convos`}
          />
          <BigStat
            tone="amber"
            label="Needs you"
            value={data.conversations.needs_human}
            sublabel={data.conversations.needs_human === 0 ? 'all clear' : 'open in the inbox'}
          />
          <BigStat
            tone="you"
            label="You handled"
            value={data.conversations.human}
            sublabel="merchant took over"
          />

          <BigStat
            tone="paid"
            label="Orders"
            value={data.orders.count}
            sublabel={`৳${data.orders.revenue.toLocaleString()} revenue`}
          />
          <BigStat
            tone="accent"
            label="Avg AI latency"
            value={`${(data.agent.avgLatencyMs / 1000).toFixed(2)}s`}
            sublabel={`${data.agent.runs} runs`}
          />
          <BigStat
            tone="ink"
            label="Total AI cost"
            value={`$${data.agent.totalCostUsd.toFixed(4)}`}
            sublabel={`avg $${data.agent.avgCostUsd.toFixed(5)}/run`}
          />

          <div className="rounded-2xl border border-border bg-surface p-5 md:col-span-2">
            <div className="flex items-center gap-2">
              <JamdaniMark size={13} className="text-accent" />
              <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                Message volume
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-6">
              <Bar
                label="In"
                tone="bg-accent"
                n={data.messages.in}
                total={data.messages.in + data.messages.out}
              />
              <Bar
                label="Out"
                tone="bg-you"
                n={data.messages.out}
                total={data.messages.in + data.messages.out}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <JamdaniMark size={13} className="text-accent" />
              <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                Token usage
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-[80px_1fr] gap-y-2 text-[13.5px]">
              <dt className="text-ink-3">In/run</dt>
              <dd className="tabular-nums">{data.agent.avgTokensIn.toLocaleString()}</dd>
              <dt className="text-ink-3">Out/run</dt>
              <dd className="tabular-nums">{data.agent.avgTokensOut.toLocaleString()}</dd>
            </dl>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function BigStat({
  tone,
  label,
  value,
  sublabel,
}: {
  tone: 'accent' | 'amber' | 'you' | 'paid' | 'ink';
  label: string;
  value: string | number;
  sublabel: string;
}) {
  const colorMap = {
    accent: 'text-accent',
    amber: 'text-amber',
    you: 'text-you',
    paid: 'text-paid',
    ink: 'text-ink',
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">{label}</div>
      <div
        className={cn(
          'mt-2 truncate font-display text-[32px] font-bold leading-none tabular-nums tracking-display sm:text-[40px]',
          colorMap[tone],
        )}
      >
        {value}
      </div>
      <div className="mt-2 text-[12.5px] text-ink-2">{sublabel}</div>
    </div>
  );
}

function Bar({ label, n, total, tone }: { label: string; n: number; total: number; tone: string }) {
  const pctVal = total > 0 ? Math.round((n / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
          {label}
        </div>
        <div className="font-display text-[22px] font-bold tabular-nums">{n}</div>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pctVal}%` }} />
      </div>
    </div>
  );
}

function pct(a: number, b: number) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}
function formatRange(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
