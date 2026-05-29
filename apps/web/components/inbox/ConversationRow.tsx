'use client';

import { cn } from '@/lib/cn';
import type { ConversationListItem } from '@/lib/types';
import { Avatar } from '@/components/shared/Avatar';
import { ChannelBadge } from '@/components/inbox/ChannelBadge';
import { TagChip } from '@/components/inbox/TagChip';
import { handoffLabel, isProblemCategory } from '@/lib/handoff';

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
  assigneeName,
  onClick,
}: {
  conversation: ConversationListItem;
  active: boolean;
  /** Display name of the assigned agent, resolved by the list. */
  assigneeName?: string | null;
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
  const tags = conversation.tags ?? [];
  const isComplaint = isProblemCategory(conversation.handoffCategory);

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
      <div className="relative shrink-0">
        <Avatar name={name} size={44} />
        {conversation.page?.platform && (
          <ChannelBadge
            platform={conversation.page.platform}
            size={18}
            className="absolute -bottom-0.5 -right-0.5 ring-2 ring-bg"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1 truncate text-[14.5px] font-semibold">{name}</div>
          <div className="shrink-0 text-[11.5px] text-ink-3">{when}</div>
        </div>
        <div className="truncate text-[13px] text-ink-2">{snippet}</div>
        {isComplaint && (
          <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-red-bg px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-red">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
              <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
            </svg>
            {handoffLabel(conversation.handoffCategory)}
          </div>
        )}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {tags.slice(0, 3).map((t) => (
              <TagChip key={t.id} tag={t} />
            ))}
            {tags.length > 3 && (
              <span className="text-[10.5px] font-semibold text-ink-3">+{tags.length - 3}</span>
            )}
          </div>
        )}
        {assigneeName && (
          <div className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-full bg-surface-2 px-2 py-0.5 text-[10.5px] font-semibold text-ink-2">
            <PersonIcon /> <span className="truncate">{assigneeName}</span>
          </div>
        )}
      </div>
    </button>
  );
}

function PersonIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
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
