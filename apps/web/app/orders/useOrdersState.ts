'use client';

import { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/shared/Toast';
import { usePoll } from '@/lib/use-poll';
import { api } from '@/lib/api';
import type { OrderListItem } from '@/lib/types';

export type Filter =
  | 'all'
  | 'created'
  | 'confirmed'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled';
export type OrderStatus = 'created' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

export interface ShopInfo {
  name: string;
  phone: string | null;
}

/**
 * All Orders-page state + mutations.
 *
 * The page-level component (`OrdersClient`) stays a thin orchestrator and the
 * card / drawer components stay stateless. Anything that touches the API or
 * holds long-lived state lives here.
 */
export function useOrdersState(initial: OrderListItem[]) {
  const toast = useToast();
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');
  const [shop, setShop] = useState<ShopInfo>({ name: 'Your Shop', phone: null });

  // Pull the merchant's shop info once so the invoice header is personalised.
  // Failures are silent — the invoice falls back to the default name.
  useEffect(() => {
    api
      .getSettings()
      .then((s) => setShop({ name: s.name, phone: s.notificationPhone ?? null }))
      .catch(() => undefined);
  }, []);

  usePoll(async () => {
    try {
      setOrders(await api.listOrders());
    } catch {
      /* offline */
    }
  }, 5000);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'paid') return orders.filter((o) => o.paymentStatus === 'paid');
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const revenue = useMemo(
    () =>
      orders.filter((o) => o.status !== 'cancelled').reduce((acc, o) => acc + Number(o.total), 0),
    [orders],
  );

  const setStatus = async (
    id: string,
    status: OrderStatus,
    opts?: { notifyCustomer?: boolean; trackingNote?: string },
  ) => {
    try {
      const updated = await api.setOrderStatus(id, status, opts);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast(
        'success',
        opts?.notifyCustomer ? `Marked ${status} — customer notified.` : `Marked ${status}.`,
      );
    } catch {
      toast('error', "Couldn't update status.");
    }
  };

  const markPaid = async (id: string) => {
    try {
      const updated = await api.markOrderPaid(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast('success', 'Marked as paid.');
    } catch {
      toast('error', "Couldn't update — try again.");
    }
  };

  return { orders, filter, setFilter, filtered, revenue, shop, setStatus, markPaid };
}
