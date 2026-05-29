'use client';

import { useEffect, useState } from 'react';
import { OrdersClient } from './OrdersClient';
import { api } from '@/lib/api';
import type { OrderListItem } from '@/lib/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  useEffect(() => {
    api.listOrders().then(setOrders).catch(() => setOrders([]));
  }, []);
  if (orders === null) return null;
  return <OrdersClient initial={orders} />;
}
