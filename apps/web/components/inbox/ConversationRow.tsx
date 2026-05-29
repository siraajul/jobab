'use client';

import { cn } from '@/lib/cn';
import type { ConversationListItem } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';

/**
 * Time-decay shading for `needs_human` rows. Fresh asks shade gently; older
 * ones gain progressively stronger amber rings and finally a pulse. Triage
 * becomes visual instead of cognitive.
 */
function urgencyClass(status: string, ageMs: number): string {
  if (status !== 'needs_human') return '';
  if (ageMs < 5 * 60_000) return 'bg-amber-bg';
  if (ageMs < 60 * 60_000) return 'bg-amber-bg ring-1 ring-amber/30';
  if (ageMs < 4 * 60 * 60_000) return 'bg-amber-bg ring-2 ring-amber/60';
  return 'bg-amber-bg ring-2 ring-amber animate-jb-pulse';
}

export function ConversationRow({
  conversation,
  active,
  onClick,
}: {
  conversation: ConversationListItem;
  active: boolean;
  onClick: () => void;
}) {
  const isNeedsHuman = conversation.status === 'needs_human';
  const ageMs = conversation.lastCustomerMessageAt
    ? Date.now() - new Date(conversation.lastCustomerMessageAt).getTime()
    : 0;
  const urgency = urgencyClass(conversation.status, ageMs);
  const last = conversation.messages[0];
  const snippet = last?.content ?? '';
  const when = conversation.lastCustomerMessageAt
    ? relativeTime(new Date(conversation.lastCustomerMessageAt))
    : '';
  const name = conversation.customerName ?? conversation.externalUserId;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-start gap-3 rounded-[14px] px-3.5 py-3 text-left transition-colors',
        active && 'bg-surface shadow-sm',
        !active && !isNeedsHuman && 'hover:bg-surface-2',
        !active && isNeedsHuman && urgency,
      )}
    >
      {active && (
        <span className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full bg-accent" />
      )}
      <Avatar name={name} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{name}</div>
          <div className="shrink-0 text-[11.5px] text-ink-3">{when}</div>
        </div>
        <div className="truncate text-[13px] text-ink-2">{snippet}</div>
      </div>
    </button>
  );
}

function relativeTime(d: Date): string {
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}
