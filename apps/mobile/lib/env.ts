import Constants from 'expo-constants';

/**
 * On a device, `localhost` resolves to the device itself — we read the
 * computer's LAN IP via Expo's `hostUri` and replace the port.
 *
 * Override at runtime with the `JOBAB_API_URL` env var (e.g. for a tunnel).
 */
function defaultApiUrl(): string {
  const fromExtra = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  if (fromExtra && fromExtra !== 'http://localhost:3000') return fromExtra;
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost ?? '';
  const host = hostUri.split(':')[0];
  if (host && host !== 'localhost') return `http://${host}:3000`;
  return 'http://localhost:3000';
}

export const apiUrl = process.env.JOBAB_API_URL ?? defaultApiUrl();
