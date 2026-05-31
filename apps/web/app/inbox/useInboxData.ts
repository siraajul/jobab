'use client';

import { useEffect, useState } from 'react';
import { usePoll } from '@/lib/use-poll';
import { api, type MemberRow } from '@/lib/api';
import type { ConversationDetail, ConversationListItem, Order, Tag } from '@/lib/types';
import { sameOrder } from './filters';

const POLL_MS = 3000;

/**
 * Owns inbox data: the conversation list, open threads, per-conversation
 * orders, and the active selection. Also fetches the rarely-changing reference
 * data (team members, tag palette, shop name) once at mount, and refreshes
 * list + active thread on a 3s poll.
 *
 * Returns raw setters so the mutations hook can apply optimistic updates.
 */
export function useInboxData(initial: {
  conversations: ConversationListItem[];
  threads: Record<string, ConversationDetail>;
  orders: Record<string, Order | null>;
}) {
  const [conversations, setConversations] = useState(initial.conversations);
  const [threads, setThreads] = useState(initial.threads);
  const [orders, setOrders] = useState(initial.orders);
  const [activeId, setActiveId] = useState(initial.conversations[0]?.id ?? null);
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

  return {
    conversations,
    threads,
    orders,
    activeId,
    members,
    tags,
    shopName,
    setConversations,
    setThreads,
    setActiveId,
    setTags,
  };
}
