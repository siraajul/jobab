import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import type { ConversationDetail } from '@jobab/shared';

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [conv, setConv] = useState<ConversationDetail | null>(null);
  const [olderExhausted, setOlderExhausted] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  const load = async () => {
    if (!id) return;
    try {
      setConv(await api.getConversation(id));
    } catch {
      /* offline */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [conv?.messages.length]);

  const onTakeOver = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    await api.takeOver(id).catch(() => undefined);
    load();
  };
  const onHandBack = async () => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    await api.handBack(id).catch(() => undefined);
    load();
  };

  const send = async () => {
    if (!id || !draft.trim()) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    try {
      await api.reply(id, draft);
      setDraft('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <Stack.Screen
        options={{
          title: conv?.customerName ?? 'Conversation',
          headerRight: () => (
            <View className="flex-row gap-2">
              {conv?.status === 'bot' ? (
                <TouchableOpacity onPress={onTakeOver} className="rounded-full bg-accentSoft px-3 py-1.5">
                  <Text className="text-xs font-semibold text-accent">Take over</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onHandBack} className="rounded-full bg-surface2 px-3 py-1.5">
                  <Text className="text-xs font-semibold text-ink2">Hand back</Text>
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />

      <ScrollView
        ref={scrollRef}
        className="flex-1 px-4 py-3"
        onScroll={async ({ nativeEvent }) => {
          if (
            !id ||
            !conv ||
            olderExhausted ||
            loadingOlder ||
            nativeEvent.contentOffset.y > 60
          ) return;
          const oldest = conv.messages[0];
          if (!oldest) return;
          setLoadingOlder(true);
          try {
            const older = await api.olderMessages(id, oldest.createdAt);
            if (older.length === 0) {
              setOlderExhausted(true);
            } else {
              // Reverse to put oldest-first then prepend
              setConv({
                ...conv,
                messages: [...older.reverse(), ...conv.messages] as ConversationDetail['messages'],
              });
            }
          } catch {
            /* swallow */
          } finally {
            setLoadingOlder(false);
          }
        }}
        scrollEventThrottle={200}
      >
        {conv?.messages.map((m) => {
          const me = m.sender !== 'customer';
          return (
            <View
              key={m.id}
              className={`mb-2 max-w-[80%] rounded-2xl px-3 py-2 ${
                me ? 'self-end bg-accent' : 'self-start bg-surface'
              }`}
            >
              <Text className={me ? 'text-white' : 'text-ink'}>{m.content}</Text>
            </View>
          );
        })}
      </ScrollView>

      <View className="flex-row items-center gap-2 border-t border-border bg-surface px-3 py-2.5">
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={conv?.status === 'bot' ? 'AI handling — take over to reply' : 'Type a reply…'}
          editable={conv?.status !== 'bot'}
          className="flex-1 rounded-full bg-surface2 px-4 py-2 text-base text-ink"
        />
        <TouchableOpacity
          onPress={send}
          disabled={sending || !draft.trim() || conv?.status === 'bot'}
          accessibilityLabel="Send reply"
          // 48dp hit target — Android Material guidance + Apple HIG-friendly
          style={{
            opacity: sending || !draft.trim() || conv?.status === 'bot' ? 0.5 : 1,
            minWidth: 48,
            minHeight: 48,
          }}
          className="items-center justify-center rounded-full bg-accent px-5"
        >
          <Text className="font-semibold text-white">Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
