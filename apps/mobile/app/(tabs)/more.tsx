import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '@/lib/api';

async function registerForPush(): Promise<{ token: string; platform: 'ios' | 'android' } | null> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  let final = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    final = status;
  }
  if (final !== 'granted') return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' };
}

export default function MoreScreen() {
  const [me, setMe] = useState<{ email: string; name: string | null } | null>(null);
  const [pushOn, setPushOn] = useState(false);

  useEffect(() => {
    api
      .me()
      .then((u) => setMe({ email: u.email, name: u.name }))
      .catch(() => undefined);
  }, []);

  const enablePush = async () => {
    const reg = await registerForPush();
    if (!reg) {
      Alert.alert('Permission denied', 'Enable notifications in iOS / Android settings to receive alerts.');
      return;
    }
    try {
      await api.registerPushToken(reg.token, reg.platform);
      setPushOn(true);
      Alert.alert('Push enabled', "You'll get an alert when a customer DMs.");
    } catch {
      Alert.alert('Failed', "Couldn't register push token.");
    }
  };

  return (
    <View className="flex-1 gap-4 bg-bg p-5">
      <View className="rounded-2xl bg-surface p-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-ink3">Signed in as</Text>
        <Text className="mt-1 text-base font-semibold text-ink">{me?.name ?? me?.email ?? '…'}</Text>
        {me?.name && <Text className="text-sm text-ink2">{me.email}</Text>}
      </View>

      <TouchableOpacity
        onPress={enablePush}
        className={`rounded-2xl py-4 ${pushOn ? 'bg-paidBg' : 'bg-accent'}`}
      >
        <Text className={`text-center text-base font-semibold ${pushOn ? 'text-paid' : 'text-white'}`}>
          {pushOn ? 'Push notifications enabled ✓' : 'Enable push notifications'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async () => {
          await api.logout();
          router.replace('/(auth)/login');
        }}
        className="rounded-2xl border border-border2 bg-surface py-4"
      >
        <Text className="text-center text-base font-semibold text-ink2">Sign out</Text>
      </TouchableOpacity>
    </View>
  );
}
