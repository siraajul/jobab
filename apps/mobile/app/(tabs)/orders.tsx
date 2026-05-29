import { useEffect, useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import { api } from '@/lib/api';
import type { OrderListItem } from '@jobab/shared';

export default function OrdersScreen() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);

  useEffect(() => {
    api.listOrders().then(setOrders).catch(() => undefined);
  }, []);

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={orders}
      keyExtractor={(o) => o.id}
      contentContainerStyle={{ padding: 12, gap: 12 }}
      ListEmptyComponent={
        <View className="px-6 py-12">
          <Text className="text-center text-ink2">No orders yet.</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View className="rounded-2xl bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-xs font-semibold uppercase tracking-widest text-accent">
              #{item.id.slice(-6).toUpperCase()}
            </Text>
            <Text
              className={
                item.paymentStatus === 'paid'
                  ? 'text-xs font-semibold uppercase tracking-widest text-paid'
                  : 'text-xs font-semibold uppercase tracking-widest text-amber'
              }
            >
              {item.paymentStatus}
            </Text>
          </View>
          <Text className="mt-1 text-base font-semibold text-ink">{item.customerName}</Text>
          <Text className="text-sm text-ink2">{item.customerPhone}</Text>
          <View className="mt-2 flex-row items-end justify-between">
            <Text className="text-xs text-ink3">
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
            <Text className="text-2xl font-bold tabular-nums text-ink">
              ৳{Number(item.total).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    />
  );
}
