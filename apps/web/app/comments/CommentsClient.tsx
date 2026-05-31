'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { usePoll } from '@/lib/hooks/use-poll';
import { api, type CommentRow, type CommentRule } from '@/lib/api';
import { cn } from '@/lib/cn';

type IntentFilter = 'all' | 'price' | 'buy' | 'question' | 'other' | 'spam';

const FILTERS: Array<{ key: IntentFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'price', label: 'Price' },
  { key: 'buy', label: 'Buy' },
  { key: 'question', label: 'Question' },
  { key: 'other', label: 'Other' },
  { key: 'spam', label: 'Spam' },
];

export function CommentsClient({
  initialComments,
  initialRules,
}: {
  initialComments: CommentRow[];
  initialRules: CommentRule[];
}) {
  const toast = useToast();
  const [comments, setComments] = useState(initialComments);
  const [rules, setRules] = useState(initialRules);
  const [filter, setFilter] = useState<IntentFilter>('all');
  const [showRules, setShowRules] = useState(false);

  usePoll(async () => {
    try {
      const c = await api.listComments();
      setComments(c);
    } catch {
      /* offline */
    }
  }, 5000);

  const filtered = useMemo(() => {
    if (filter === 'all') return comments;
    return comments.filter((c) => c.intent === filter);
  }, [comments, filter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of comments) m[c.intent ?? 'other'] = (m[c.intent ?? 'other'] ?? 0) + 1;
    return m;
  }, [comments]);

  return (
    <AppShell
      title="Comments"
      subtitle={`${comments.length} captured · auto-replies via rules`}
      actions={
        <button
          onClick={() => setShowRules((v) => !v)}
          className="rounded-full border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-2"
        >
          {showRules ? 'Hide rules' : 'Rules'}
        </button>
      }
    >
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition',
              filter === f.key ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
            )}
          >
            {f.label}
            {counts[f.key] && (
              <span className="ml-1.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-amber/30 px-1 text-[10px] font-bold text-amber">
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {showRules && <RulesPanel rules={rules} onChange={setRules} />}

      {filtered.length === 0 ? (
        <EmptyState
          title="No comments yet"
          body="When customers comment on your posts or ads, they'll show up here with detected intent and the public reply we sent. Try the local `pnpm send` CLI to simulate one."
        />
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <CommentCard key={c.id} comment={c} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function CommentCard({ comment: c }: { comment: CommentRow }) {
  return (
    <article className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="max-w-full truncate font-display text-[14.5px] font-semibold tracking-display">
              {c.commenterName ?? 'Commenter'}
            </span>
            <IntentChip intent={c.intent} confidence={c.intentConfidence} />
            <span className="text-[11px] uppercase tracking-[0.14em] text-ink-3">
              post {c.postId.slice(-8)}
            </span>
          </div>
          <p className="mt-1.5 text-[14px] text-ink">{c.content}</p>

          {c.publicReplyText && (
            <div className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-[13px]">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-accent-ink">
                Public reply {c.publicReplySent ? '✓ sent' : '· pending'}
              </div>
              <div className="mt-0.5 text-ink">{c.publicReplyText}</div>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="text-[10.5px] uppercase tracking-[0.16em] text-ink-3">
            {new Date(c.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
          </span>
          {c.privateReply && (
            <Link
              href={`/inbox?c=${c.privateReply.id}`}
              className="rounded-lg border border-border-2 bg-surface-2 px-3 py-1.5 text-[12px] font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              <JamdaniMark size={10} className="-mt-0.5 mr-1 inline align-middle text-accent" />
              Open DM →
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function IntentChip({
  intent,
  confidence,
}: {
  intent: CommentRow['intent'];
  confidence: number | null;
}) {
  if (!intent) return null;
  const tone =
    intent === 'price'
      ? 'bg-accent-soft text-accent-ink'
      : intent === 'buy'
        ? 'bg-paid-bg text-paid'
        : intent === 'question'
          ? 'bg-you-bg text-you'
          : intent === 'spam'
            ? 'bg-red-bg text-red'
            : 'bg-surface-2 text-ink-2';
  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em]',
        tone,
      )}
    >
      {intent}
      {typeof confidence === 'number' && (
        <span className="ml-1 opacity-60">{Math.round(confidence * 100)}%</span>
      )}
    </span>
  );
}

function RulesPanel({
  rules,
  onChange,
}: {
  rules: CommentRule[];
  onChange: (rules: CommentRule[]) => void;
}) {
  const toast = useToast();

  const update = async (rule: CommentRule, patch: Partial<CommentRule>) => {
    try {
      const next = await api.updateCommentRule(rule.intent, patch);
      onChange(rules.map((r) => (r.intent === rule.intent ? next : r)));
      toast('success', `Updated ${rule.intent} rule.`);
    } catch {
      toast('error', "Couldn't update rule.");
    }
  };

  return (
    <section className="mb-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <JamdaniMark size={13} className="text-accent" />
        <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
          Comment rules
        </div>
      </div>
      <p className="mt-1 text-[12.5px] text-ink-2">
        For each intent, decide whether the AI replies publicly, what it says, and whether to open a
        DM.
      </p>
      <div className="mt-3 space-y-3">
        {rules.map((r) => (
          <div
            key={r.intent}
            className="grid grid-cols-1 gap-2 rounded-xl bg-surface-2 p-3 text-[13px] sm:grid-cols-[80px_120px_1fr_120px] sm:items-center"
          >
            <div className="font-bold uppercase tracking-[0.14em] text-ink">{r.intent}</div>
            <select
              value={r.replyMode}
              onChange={(e) => update(r, { replyMode: e.target.value as CommentRule['replyMode'] })}
              className="rounded-md border border-border-2 bg-surface px-2 py-1.5 text-[12.5px]"
            >
              <option value="ai">AI auto-reply</option>
              <option value="manual">Manual only</option>
              <option value="off">Off</option>
            </select>
            <input
              type="text"
              value={r.publicTemplate ?? ''}
              placeholder="public reply template (Banglish ok)"
              onChange={(e) =>
                onChange(
                  rules.map((rr) =>
                    rr.intent === r.intent ? { ...rr, publicTemplate: e.target.value } : rr,
                  ),
                )
              }
              onBlur={(e) => update(r, { publicTemplate: e.target.value || null })}
              className="rounded-md border border-border-2 bg-surface px-2 py-1.5 text-[12.5px]"
            />
            <label className="flex items-center gap-2 text-[12px] text-ink-2">
              <input
                type="checkbox"
                checked={r.privateAllowed}
                onChange={(e) => update(r, { privateAllowed: e.target.checked })}
              />
              Open DM
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
