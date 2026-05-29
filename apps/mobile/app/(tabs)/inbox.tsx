import { useEffect, useState, useCallback } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { api } from '@/lib/api';
import type { ConversationListItem } from '@jobab/shared';

const STATUS_COLOR: Record<string, string> = {
  bot: 'text-accent',
  needs_human: 'text-amber',
  human: 'text-you',
  closed: 'text-ink3',
};

export default function InboxScreen() {
  const [list, setList] = useState<ConversationListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listConversations();
      setList(data);
    } catch {
      // offline; keep last list
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <FlatList
      className="flex-1 bg-bg"
      data={list}
      keyExtractor={(c) => c.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
        />
      }
      ItemSeparatorComponent={() => <View className="h-px bg-border" />}
      ListEmptyComponent={
        <View className="px-6 py-12">
          <Text className="text-center text-ink2">No conversations yet.</Text>
        </View>
      }
      renderItem={({ item }) => {
        const last = item.messages?.[0];
        return (
          <TouchableOpacity
            onPress={() => router.push(`/conversation/${item.id}`)}
            className="flex-row gap-3 bg-surface px-4 py-3.5"
          >
            <View className="h-11 w-11 items-center justify-center rounded-full bg-accentSoft">
              <Text className="font-semibold text-accent">
                {(item.customerName ?? '?').slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-ink">
                  {item.customerName ?? item.externalUserId}
                </Text>
                <Text className={`text-xs ${STATUS_COLOR[item.status]}`}>
                  {item.status.replace('_', ' ')}
                </Text>
              </View>
              {last && (
                <Text numberOfLines={1} className="mt-0.5 text-sm text-ink2">
                  {last.content}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}
