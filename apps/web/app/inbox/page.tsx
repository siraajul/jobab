'use client';

import { useEffect, useState } from 'react';
import { InboxClient } from './InboxClient';
import { api } from '@/lib/api';
import type { ConversationDetail, ConversationListItem, Order } from '@/lib/types';

export default function InboxPage() {
  const [conversations, setConversations] = useState<ConversationListItem[] | null>(null);
  const [threads, setThreads] = useState<Record<string, ConversationDetail>>({});
  const [orders, setOrders] = useState<Record<string, Order | null>>({});

  useEffect(() => {
    api
      .listConversations()
      .then(async (list) => {
        setConversations(list);
        const slice = list.slice(0, 8);
        const threadEntries = await Promise.all(
          slice.map(async (c) => [c.id, await api.getConversation(c.id).catch(() => null)] as const),
        );
        const orderEntries = await Promise.all(
          slice.map(async (c) => [c.id, await api.orderForConversation(c.id).catch(() => null)] as const),
        );
        setThreads(
          Object.fromEntries(
            threadEntries.filter(([, v]) => v) as Array<[string, ConversationDetail]>,
          ),
        );
        setOrders(Object.fromEntries(orderEntries));
      })
      .catch(() => setConversations([]));
  }, []);

  if (conversations === null) return null;
  return (
    <InboxClient
      initialConversations={conversations}
      initialThreads={threads}
      initialOrders={orders}
    />
  );
}
