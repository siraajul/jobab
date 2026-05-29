'use client';

import { ConversationRow } from '@/components/inbox/ConversationRow';
import { ChannelBadge } from '@/components/inbox/ChannelBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/cn';
import type { MemberRow } from '@/lib/api';
import type { ConversationListItem } from '@/lib/types';
import { ListHeader } from './ListHeader';
import type { ChannelFilter, Filter, Sort } from './useInboxState';

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'recent', label: 'Most recent' },
  { key: 'urgent', label: 'Urgent first' },
  { key: 'oldest', label: 'Longest waiting' },
];

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs', label: 'Needs you' },
  { key: 'complaints', label: 'Complaints' },
  { key: 'ai', label: 'AI' },
  { key: 'you', label: 'You' },
];

const CHANNELS: Array<{ key: ChannelFilter; label: string }> = [
  { key: 'all', label: 'All channels' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

export function ConversationList({
  counts,
  channelCounts,
  members,
  shopName,
  filtered,
  filter,
  setFilter,
  sort,
  setSort,
  channel,
  setChannel,
  query,
  setQuery,
  activeId,
  selectConversation,
  searchRef,
}: {
  counts: { needs: number; ai: number; you: number; complaints: number };
  channelCounts: { facebook: number; instagram: number; whatsapp: number };
  members: MemberRow[];
  shopName: string | null;
  filtered: ConversationListItem[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  channel: ChannelFilter;
  setChannel: (c: ChannelFilter) => void;
  query: string;
  setQuery: (q: string) => void;
  activeId: string | null;
  selectConversation: (id: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}) {
  const memberName = (userId: string | null | undefined): string | null => {
    if (!userId) return null;
    const m = members.find((m) => m.user.id === userId);
    return m ? (m.user.name ?? m.user.email) : null;
  };
  return (
    <>
      <ListHeader counts={counts} shopName={shopName} />

      <div className="px-4 sm:px-5 py-2">
        <div className="flex items-center gap-2 rounded-[12px] border border-border-2 bg-surface-2 px-3 py-2.5 text-ink-3 transition focus-within:border-accent">
          <SearchIcon />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by customer…  (⌘/)"
            aria-label="Search conversations"
            className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-ink-3 hover:text-ink"
              aria-label="Clear search"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-2 sm:px-5">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-[12px] font-semibold text-ink-2 outline-none focus:border-accent"
          aria-label="Sort conversations"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Channel filter — compact segmented control so it never overflows the
            narrow list column. */}
        <div className="flex items-center gap-0.5 rounded-full bg-surface-2 p-0.5" role="tablist" aria-label="Channel">
          {CHANNELS.map((ch) => {
            const n = ch.key === 'all' ? 0 : channelCounts[ch.key as keyof typeof channelCounts];
            return (
              <button
                key={ch.key}
                onClick={() => setChannel(ch.key)}
                role="tab"
                aria-selected={channel === ch.key}
                title={ch.key === 'all' ? 'All channels' : `${ch.label} · ${n}`}
                className={cn(
                  'inline-flex h-6 items-center justify-center rounded-full px-2 text-[11px] font-bold transition',
                  channel === ch.key ? 'bg-surface text-ink shadow-sm' : 'text-ink-3 hover:text-ink-2',
                )}
              >
                {ch.key === 'all' ? 'All' : <ChannelBadge platform={ch.key} size={15} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 px-4 sm:px-5 pb-3" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            role="tab"
            aria-selected={filter === f.key}
            className={
              'inline-flex items-center whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ' +
              (filter === f.key
                ? 'bg-ink text-bg'
                : 'bg-surface-2 text-ink-2 hover:bg-surface-3')
            }
          >
            {f.label}
            {f.key === 'needs' && counts.needs > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white">
                {counts.needs}
              </span>
            )}
            {f.key === 'complaints' && counts.complaints > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
                {counts.complaints}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-3 pb-4">
        {filtered.length === 0 ? (
          <EmptyState
            title={query ? 'No matches' : 'Inbox is calm'}
            body={
              query
                ? `Nothing matches "${query}". Try a different name or filter.`
                : 'New customer DMs will land here. Try sending a fake one from the terminal to test the loop.'
            }
          />
        ) : (
          filtered.map((c) => (
            <ConversationRow
              key={c.id}
              conversation={c}
              active={c.id === activeId}
              assigneeName={memberName(c.assignedUserId)}
              onClick={() => selectConversation(c.id)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        onClick={async () => {
          await fetch('/api/backend/auth/logout', { method: 'POST' });
          window.location.href = '/login';
        }}
        className="m-3 rounded-lg border border-border-2 bg-surface px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-ink-2 transition hover:bg-surface-2"
      >
        Sign out
      </button>
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 6l12 12M6 18L18 6" />
    </svg>
  );
}
