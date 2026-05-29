'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePoll } from '@/lib/use-poll';
import { api, type MemberRow } from '@/lib/api';
import { isProblemCategory } from '@/lib/handoff';
import { useToast } from '@/components/shared/Toast';
import type {
  ConversationDetail,
  ConversationListItem,
  ConversationStatus,
  ConversationTag,
  Order,
  Tag,
} from '@/lib/types';

export type Filter = 'all' | 'needs' | 'complaints' | 'ai' | 'you';
export type Sort = 'recent' | 'urgent' | 'oldest';
export type ChannelFilter = 'all' | 'facebook' | 'instagram' | 'whatsapp';

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
  const [channel, setChannel] = useState<ChannelFilter>('all');
  const [query, setQuery] = useState('');
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [shopName, setShopName] = useState<string | null>(null);

  // Team roster + tag palette + shop name — used for the assign menu, tag
  // editor, assignee names / tag chips, and the inbox header. Fetched once;
  // all change rarely.
  useEffect(() => {
    api
      .listMembers()
      .then(setMembers)
      .catch(() => {
        /* non-fatal — assignment UI simply shows no candidates */
      });
    api
      .listTags()
      .then(setTags)
      .catch(() => {
        /* non-fatal — tag editor simply shows no palette */
      });
    api
      .getSettings()
      .then((s) => setShopName(s.name))
      .catch(() => {
        /* non-fatal — header falls back to a default */
      });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = conversations.filter((c) => {
      if (filter === 'needs' && c.status !== 'needs_human') return false;
      if (filter === 'complaints' && !isProblemCategory(c.handoffCategory)) return false;
      if (filter === 'ai' && c.status !== 'bot') return false;
      if (filter === 'you' && c.status !== 'human') return false;
      if (channel !== 'all' && c.page?.platform !== channel) return false;
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
  }, [conversations, filter, sort, channel, query]);

  const channelCounts = useMemo(() => {
    const c = { facebook: 0, instagram: 0, whatsapp: 0 };
    for (const conv of conversations) {
      const p = conv.page?.platform;
      if (p === 'facebook' || p === 'instagram' || p === 'whatsapp') c[p]++;
    }
    return c;
  }, [conversations]);

  const counts = useMemo(() => {
    let needs = 0;
    let ai = 0;
    let you = 0;
    let complaints = 0;
    for (const c of conversations) {
      if (c.status === 'needs_human') needs++;
      else if (c.status === 'bot') ai++;
      else if (c.status === 'human') you++;
      if (isProblemCategory(c.handoffCategory)) complaints++;
    }
    return { needs, ai, you, complaints };
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

  const assign = async (assigneeUserId: string | null) => {
    if (!activeId) return;
    const id = activeId;
    const prevAssignee =
      conversations.find((c) => c.id === id)?.assignedUserId ?? null;
    const apply = (uid: string | null) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, assignedUserId: uid } : c)),
      );
      setThreads((prev) =>
        prev[id] ? { ...prev, [id]: { ...prev[id], assignedUserId: uid } } : prev,
      );
    };
    apply(assigneeUserId);
    try {
      await api.assignConversation(id, assigneeUserId);
      const who = assigneeUserId
        ? members.find((m) => m.user.id === assigneeUserId)?.user.name ??
          members.find((m) => m.user.id === assigneeUserId)?.user.email ??
          'agent'
        : null;
      toast('success', who ? `Assigned to ${who}.` : 'Unassigned.');
    } catch {
      apply(prevAssignee);
      toast('error', "Couldn't update the assignment — try again.");
    }
  };

  // Optimistically rewrite the active conversation's tags in both the list row
  // and the open thread, then persist. On failure the caller-provided rollback
  // restores the prior set.
  const patchTags = (id: string, updater: (ts: ConversationTag[]) => ConversationTag[]) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, tags: updater(c.tags ?? []) } : c)),
    );
    setThreads((prev) =>
      prev[id] ? { ...prev, [id]: { ...prev[id], tags: updater(prev[id].tags ?? []) } } : prev,
    );
  };

  const addTag = async (tag: ConversationTag) => {
    if (!activeId) return;
    const id = activeId;
    const current = conversations.find((c) => c.id === id)?.tags ?? [];
    if (current.some((t) => t.id === tag.id)) return;
    patchTags(id, (ts) => [...ts, tag]);
    try {
      await api.addConversationTag(id, tag.id);
    } catch {
      patchTags(id, (ts) => ts.filter((t) => t.id !== tag.id));
      toast('error', "Couldn't add the tag — try again.");
    }
  };

  const removeTag = async (tagId: string) => {
    if (!activeId) return;
    const id = activeId;
    const removed = (conversations.find((c) => c.id === id)?.tags ?? []).find(
      (t) => t.id === tagId,
    );
    patchTags(id, (ts) => ts.filter((t) => t.id !== tagId));
    try {
      await api.removeConversationTag(id, tagId);
    } catch {
      if (removed) patchTags(id, (ts) => [...ts, removed]);
      toast('error', "Couldn't remove the tag — try again.");
    }
  };

  /** Create a new palette tag and attach it to the active conversation. */
  const createTag = async (name: string, color: string) => {
    try {
      const tag = await api.createTag(name, color);
      setTags((prev) => [...prev, tag]);
      await addTag({ id: tag.id, name: tag.name, color: tag.color });
      return tag;
    } catch {
      toast('error', "Couldn't create the tag — the name may already exist.");
      return null;
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
    channelCounts,
    members,
    tags,
    shopName,
    active,
    activeOrder,
    activeId,
    aiDraft,
    filter,
    sort,
    channel,
    query,
    // setters
    setActiveId,
    setFilter,
    setSort,
    setChannel,
    setQuery,
    // mutations
    takeOver,
    handBack,
    assign,
    addTag,
    removeTag,
    createTag,
    send,
  };
}

function sameOrder(a: ConversationListItem[], b: ConversationListItem[]) {
  return a.length === b.length && a.every((c, i) => c.id === b[i].id);
}
