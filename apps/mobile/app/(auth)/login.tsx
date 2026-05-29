import { useState } from 'react';
import { router } from 'expo-router';
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { api } from '@/lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.login(email, password);
      router.replace('/(tabs)/inbox');
    } catch (e) {
      setError('Wrong email or password.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-bg"
    >
      <View className="flex-1 items-center justify-center px-6">
        <Text className="mb-2 text-3xl font-bold tracking-tight text-ink">Jobab.</Text>
        <Text className="mb-8 text-sm text-ink2">Merchant inbox in your pocket.</Text>

        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          className="mb-3 w-full rounded-xl border border-border2 bg-surface2 px-4 py-3 text-base text-ink"
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          className="mb-4 w-full rounded-xl border border-border2 bg-surface2 px-4 py-3 text-base text-ink"
        />
        {error && <Text className="mb-3 text-sm text-red">{error}</Text>}
        <TouchableOpacity
          onPress={submit}
          disabled={busy || !email || !password}
          className="w-full rounded-xl bg-accent py-3.5"
          style={{ opacity: busy || !email || !password ? 0.5 : 1 }}
        >
          <Text className="text-center text-base font-semibold text-white">
            {busy ? 'Signing in…' : 'Sign in'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
