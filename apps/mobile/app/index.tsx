import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { api } from '@/lib/api';

/** Auth gate — routes to /(tabs)/inbox if signed in, /(auth)/login otherwise. */
export default function Index() {
  useEffect(() => {
    (async () => {
      const session = await api.hasSession();
      router.replace(session ? '/(tabs)/inbox' : '/(auth)/login');
    })();
  }, []);

  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <ActivityIndicator color="#1F6E47" />
    </View>
  );
}
