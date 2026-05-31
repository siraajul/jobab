'use client';

import { useMemo, useState } from 'react';
import type { ConversationDetail, ConversationListItem, Order } from '@/lib/types';
import {
  applyFilters,
  computeChannelCounts,
  computeCounts,
  type ChannelFilter,
  type Filter,
  type Sort,
} from './filters';
import { useInboxData } from './useInboxData';
import { useInboxMutations } from './useInboxMutations';

/**
 * Top-level inbox state composer. The orchestrator (`InboxClient`) consumes
 * this hook and renders pure layout — every piece of behavior lives in one of
 * three focused modules:
 *
 *  - `useInboxData`         — server-backed data + polling + reference data
 *  - `useInboxMutations`    — optimistic take-over / assign / tag / send
 *  - `filters.ts`           — pure filter / sort / counts helpers
 */
export function useInboxState(initial: {
  conversations: ConversationListItem[];
  threads: Record<string, ConversationDetail>;
  orders: Record<string, Order | null>;
}) {
  const data = useInboxData(initial);

  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(
    () => applyFilters(data.conversations, { filter, sort, channel, query }),
    [data.conversations, filter, sort, channel, query],
  );
  const counts = useMemo(() => computeCounts(data.conversations), [data.conversations]);
  const channelCounts = useMemo(
    () => computeChannelCounts(data.conversations),
    [data.conversations],
  );

  const active = data.activeId ? data.threads[data.activeId] : null;
  const activeOrder = data.activeId ? (data.orders[data.activeId] ?? null) : null;

  /** The AI's most recent outgoing message — the merchant can drop this into
   *  the composer with one click and edit instead of typing from scratch. */
  const aiDraft = useMemo(() => {
    if (!active) return null;
    for (let i = active.messages.length - 1; i >= 0; i--) {
      const m = active.messages[i];
      if (m.sender === 'agent') return m.content;
      if (m.sender === 'customer') break;
    }
    return null;
  }, [active]);

  const mutations = useInboxMutations({
    activeId: data.activeId,
    conversations: data.conversations,
    members: data.members,
    setConversations: data.setConversations,
    setThreads: data.setThreads,
    setTags: data.setTags,
  });

  return {
    // state
    conversations: data.conversations,
    filtered,
    counts,
    channelCounts,
    members: data.members,
    tags: data.tags,
    shopName: data.shopName,
    active,
    activeOrder,
    activeId: data.activeId,
    aiDraft,
    filter,
    sort,
    channel,
    query,
    // setters
    setActiveId: data.setActiveId,
    setFilter,
    setSort,
    setChannel,
    setQuery,
    // mutations
    ...mutations,
  };
}

// Re-exported so existing imports (`import type { Filter } from './useInboxState'`)
// keep working.
export type { Filter, Sort, ChannelFilter } from './filters';
