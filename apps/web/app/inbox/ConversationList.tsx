'use client';

import { ConversationRow } from '@/components/inbox/ConversationRow';
import { EmptyState } from '@/components/shared/EmptyState';
import type { ConversationListItem } from '@/lib/types';
import { ListHeader } from './ListHeader';
import type { Filter, Sort } from './useInboxState';

const SORTS: Array<{ key: Sort; label: string }> = [
  { key: 'recent', label: 'Most recent' },
  { key: 'urgent', label: 'Urgent first' },
  { key: 'oldest', label: 'Longest waiting' },
];

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'needs', label: 'Needs you' },
  { key: 'ai', label: 'AI handling' },
  { key: 'you', label: "You're handling" },
];

export function ConversationList({
  counts,
  filtered,
  filter,
  setFilter,
  sort,
  setSort,
  query,
  setQuery,
  activeId,
  selectConversation,
  searchRef,
}: {
  counts: { needs: number; ai: number; you: number };
  filtered: ConversationListItem[];
  filter: Filter;
  setFilter: (f: Filter) => void;
  sort: Sort;
  setSort: (s: Sort) => void;
  query: string;
  setQuery: (q: string) => void;
  activeId: string | null;
  selectConversation: (id: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}) {
  return (
    <>
      <ListHeader counts={counts} />

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

      <div className="flex items-center justify-between gap-2 px-4 sm:px-5 pb-1">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-[12px] font-semibold text-ink-2 outline-none focus:border-accent"
          aria-label="Sort conversations"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
        <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3 hidden sm:inline">
          j/k navigate · enter open
        </span>
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 sm:px-5 pb-3" role="tablist">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            role="tab"
            aria-selected={filter === f.key}
            className={
              'whitespace-nowrap rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition ' +
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
