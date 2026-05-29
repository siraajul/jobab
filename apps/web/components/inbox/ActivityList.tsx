'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { ConversationActivityItem } from '@/lib/types';
import { Skeleton } from '@/components/shared/Skeleton';

/** Friendly labels for the tools the agent can fire. Anything unmapped falls
 *  back to the raw tool name so new tools still render. */
const TOOL_LABELS: Record<string, string> = {
  search_catalog: 'Searched the catalog',
  match_product_by_image: 'Matched a product from a photo',
  check_stock: 'Checked stock',
  save_customer_detail: 'Saved a customer detail',
  create_order: 'Created an order',
  handoff_to_human: 'Handed off to a human',
};

/** The AI activity feed for a conversation — one entry per agent run, listing
 *  which tools fired plus token/latency cost. Sourced from `/activity`. */
export function ActivityList({ conversationId }: { conversationId: string }) {
  const [items, setItems] = useState<ConversationActivityItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setItems(null);
    setError(false);
    api
      .conversationActivity(conversationId)
      .then((rows) => {
        if (!cancelled) setItems(rows);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  if (error) {
    return <p className="px-5 pb-2 text-[13px] text-ink-3">Couldn’t load activity — reopen the conversation.</p>;
  }
  if (items === null) {
    return (
      <div className="space-y-3 px-5 pb-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <p className="px-5 pb-2 text-[13px] text-ink-3">
        When the AI works on this conversation, each run and the tools it used show up here.
      </p>
    );
  }

  return (
    <div className="px-5 pb-1">
      <ol className="relative space-y-3 border-l border-border pl-4">
        {items.map((run) => {
          const tools = run.toolCalls ?? [];
          const cost = Number(run.costUsd) || 0;
          return (
            <li key={run.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-accent-soft" />
              <div className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] font-semibold text-ink">
                    {tools.length === 0
                      ? 'Replied to the customer'
                      : `${tools.length} tool${tools.length > 1 ? 's' : ''} used`}
                  </span>
                  <time className="shrink-0 text-[11px] text-ink-3">
                    {formatTime(run.createdAt)}
                  </time>
                </div>
                {tools.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {tools.map((t, i) => (
                      <li
                        key={i}
                        className="flex items-center gap-1.5 text-[12.5px] text-ink-2"
                      >
                        <span
                          className={
                            'h-1.5 w-1.5 shrink-0 rounded-full ' +
                            (t.error ? 'bg-red' : 'bg-accent')
                          }
                        />
                        <span className="truncate">{TOOL_LABELS[t.name] ?? t.name}</span>
                        {t.error && (
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-red">
                            failed
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex items-center gap-3 text-[10.5px] uppercase tracking-wider text-ink-3">
                  <span className="truncate">{run.model}</span>
                  <span className="tabular-nums">
                    {run.inputTokens + run.outputTokens} tok
                  </span>
                  {cost > 0 && <span className="tabular-nums">${cost.toFixed(4)}</span>}
                  {run.latencyMs > 0 && (
                    <span className="tabular-nums">{(run.latencyMs / 1000).toFixed(1)}s</span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
