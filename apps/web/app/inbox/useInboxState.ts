'use client';

import { useMemo, useState } from 'react';
import { usePoll } from '@/lib/use-poll';
import { api } from '@/lib/api';
import { useToast } from '@/components/shared/Toast';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationStatus,
  Order,
} from '@/lib/types';

export type Filter = 'all' | 'needs' | 'ai' | 'you';
export type Sort = 'recent' | 'urgent' | 'oldest';

function statusPriority(status: string): number {
  if (status === 'needs_human') return 0;
  if (status === 'human') return 1;
  if (status === 'bot') return 2;
  return 3;
}

const POLL_MS = 3000;

/**
 * The inbox is data-heavy: a list, a thread, a live order, plus optimistic
 * mutations and a 3s poll. Extracted here so the JSX component can stay focused
 * on layout — and so we can unit-test the state transitions later.
 */
export function useInboxState(initial: {
  conversations: ConversationListItem[];
  threads: Record<string, ConversationDetail>;
  orders: Record<string, Order | null>;
}) {
  const toast = useToast();
  const [conversations, setConversations] = useState(initial.conversations);
  const [threads, setThreads] = useState(initial.threads);
  const [orders, setOrders] = useState(initial.orders);
  const [activeId, setActiveId] = useState(initial.conversations[0]?.id ?? null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<Sort>('recent');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = conversations.filter((c) => {
      if (filter === 'needs' && c.status !== 'needs_human') return false;
      if (filter === 'ai' && c.status !== 'bot') return false;
      if (filter === 'you' && c.status !== 'human') return false;
      if (q && !(c.customerName ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
    const tsOf = (c: ConversationListItem) =>
      c.lastCustomerMessageAt ? new Date(c.lastCustomerMessageAt).getTime() : 0;
    switch (sort) {
      case 'urgent':
        // needs_human first, then oldest-needs-first (longest waiting), then the rest by recency
        return [...matched].sort((a, b) => {
          const sp = statusPriority(a.status) - statusPriority(b.status);
          if (sp !== 0) return sp;
          if (a.status === 'needs_human' && b.status === 'needs_human') return tsOf(a) - tsOf(b);
          return tsOf(b) - tsOf(a);
        });
      case 'oldest':
        return [...matched].sort((a, b) => tsOf(a) - tsOf(b));
      case 'recent':
      default:
        return [...matched].sort((a, b) => tsOf(b) - tsOf(a));
    }
  }, [conversations, filter, sort, query]);

  const counts = useMemo(() => {
    let needs = 0;
    let ai = 0;
    let you = 0;
    for (const c of conversations) {
      if (c.status === 'needs_human') needs++;
      else if (c.status === 'bot') ai++;
      else if (c.status === 'human') you++;
    }
    return { needs, ai, you };
  }, [conversations]);

  const active = activeId ? threads[activeId] : null;
  const activeOrder = activeId ? orders[activeId] ?? null : null;

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

  usePoll(
    async () => {
      try {
        const list = await api.listConversations();
        setConversations((prev) => (sameOrder(prev, list) ? list : list));
        if (activeId) {
          const [convo, order] = await Promise.all([
            api.getConversation(activeId).catch(() => null),
            api.orderForConversation(activeId).catch(() => null),
          ]);
          if (convo) setThreads((prev) => ({ ...prev, [activeId]: convo }));
          setOrders((prev) => ({ ...prev, [activeId]: order ?? prev[activeId] ?? null }));
        }
      } catch {
        /* offline */
      }
    },
    POLL_MS,
    [activeId],
  );

  const setStatus = (id: string, status: ConversationStatus) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    setThreads((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], status } } : prev));
  };

  const takeOver = async () => {
    if (!activeId) return;
    setStatus(activeId, 'human');
    try {
      await api.takeOver(activeId);
      toast.pushUndo("You're now handling — undo?", async () => {
        setStatus(activeId, 'bot');
        try {
          await api.handBack(activeId);
        } catch {
          /* silent */
        }
      });
    } catch {
      setStatus(activeId, 'bot');
      toast('error', "Couldn't take over — check the backend connection.");
    }
  };

  const handBack = async () => {
    if (!activeId) return;
    setStatus(activeId, 'bot');
    try {
      await api.handBack(activeId);
      toast.pushUndo('Handed back to the AI — undo?', async () => {
        setStatus(activeId, 'human');
        try {
          await api.takeOver(activeId);
        } catch {
          /* silent */
        }
      });
    } catch {
      setStatus(activeId, 'human');
      toast('error', "Couldn't hand back — check the backend connection.");
    }
  };

  const send = async (text: string) => {
    if (!activeId) return;
    const now = new Date().toISOString();
    const tempId = `tmp-${Date.now()}`;
    setThreads((prev) => ({
      ...prev,
      [activeId]: {
        ...prev[activeId],
        messages: [
          ...prev[activeId].messages,
          {
            id: tempId,
            conversationId: activeId,
            direction: 'out',
            sender: 'human',
            content: text,
            createdAt: now,
          },
        ],
      },
    }));
    const tryOnce = async () => {
      try {
        await api.reply(activeId, text);
      } catch {
        toast.pushSticky(
          'error',
          "Couldn't send your reply — your message is still here. Retry?",
          { label: 'Retry', onClick: tryOnce },
        );
      }
    };
    await tryOnce();
  };

  return {
    // state
    conversations,
    filtered,
    counts,
    active,
    activeOrder,
    activeId,
    aiDraft,
    filter,
    sort,
    query,
    // setters
    setActiveId,
    setFilter,
    setSort,
    setQuery,
    // mutations
    takeOver,
    handBack,
    send,
  };
}

function sameOrder(a: ConversationListItem[], b: ConversationListItem[]) {
  return a.length === b.length && a.every((c, i) => c.id === b[i].id);
}
