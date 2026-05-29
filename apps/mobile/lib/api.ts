import * as SecureStore from 'expo-secure-store';
import type {
  AnalyticsSummary,
  ConversationDetail,
  ConversationListItem,
  Order,
  OrderListItem,
} from '@jobab/shared';
import { apiUrl } from './env';

/**
 * The backend uses an HttpOnly signed cookie for sessions. Mobile can't
 * receive HttpOnly cookies the same way a browser does, but we can ask the
 * backend to return the cookie's *value* on login and then send it back as
 * an `Authorization: Bearer <value>` header. The backend's AuthGuard reads
 * either the cookie or the Authorization header.
 *
 * For Phase 2 MVP we use the simplest mechanism: log in via the same
 * /auth/login endpoint, capture the Set-Cookie header (RN's fetch makes it
 * available via `response.headers.get('set-cookie')`), parse out the
 * `jobab_session` value, store it in SecureStore, and send it back as a
 * Cookie header on every subsequent request.
 */

const SESSION_KEY = 'jobab.session';

async function loadSession(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}
async function saveSession(value: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, value);
}
async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await loadSession();
  const res = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(session ? { cookie: `jobab_session=${session}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function parseSessionCookie(setCookieHeader: string | null): string | null {
  if (!setCookieHeader) return null;
  const match = setCookieHeader.match(/jobab_session=([^;]+)/);
  return match ? match[1] : null;
}

export const api = {
  async login(email: string, password: string) {
    const res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`login → ${res.status}`);
    const cookie = parseSessionCookie(res.headers.get('set-cookie'));
    if (!cookie) throw new Error('login: no session cookie in response');
    await saveSession(cookie);
    return res.json();
  },
  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      await clearSession();
    }
  },
  hasSession: loadSession,

  me: () => request<{ userId: string; email: string; name: string | null }>('/auth/me'),
  listConversations: () => request<ConversationListItem[]>('/conversations'),
  getConversation: (id: string) => request<ConversationDetail>(`/conversations/${id}`),
  olderMessages: (id: string, beforeIso: string, limit = 50) =>
    request<
      Array<{
        id: string;
        content: string;
        sender: 'customer' | 'agent' | 'human';
        direction: 'in' | 'out';
        createdAt: string;
        conversationId: string;
      }>
    >(`/conversations/${id}/messages/older?before=${encodeURIComponent(beforeIso)}&limit=${limit}`),
  reply: (id: string, text: string) =>
    request<unknown>(`/conversations/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  takeOver: (id: string) => request<unknown>(`/conversations/${id}/takeover`, { method: 'POST' }),
  handBack: (id: string) => request<unknown>(`/conversations/${id}/hand-back`, { method: 'POST' }),

  listOrders: () => request<OrderListItem[]>('/orders'),
  orderForConversation: (id: string) => request<Order | null>(`/orders?conversationId=${id}`),

  analytics: (days = 7) => request<AnalyticsSummary>(`/analytics/summary?days=${days}`),

  registerPushToken: (token: string, platform: 'ios' | 'android') =>
    request<unknown>('/push/tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    }),
};
