import type {
  AnalyticsSummary,
  ConversationActivityItem,
  ConversationDetail,
  ConversationListItem,
  OnboardingStatus,
  Order,
  Note,
  OrderListItem,
  Product,
  SettingsPayload,
  Tag,
} from './types';

/**
 * The web app talks to a same-origin proxy (`/api/backend/...`) that Next
 * rewrites to the backend. This keeps the session cookie same-site and
 * removes the need for `credentials: 'include'` or CORS preflight tuning.
 */
const BASE = '/api/backend';

/** Paths that are part of the auth flow itself — they're allowed to 401
 *  without triggering a redirect (otherwise wrong-password kicks the user). */
const AUTH_PATHS = new Set(['/auth/login', '/auth/sign-up', '/auth/me']);

async function fetcher<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'content-type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    // Expired/missing session — middleware lets the page load (cookie value
    // exists) but the API now rejects. Bounce to /login with `next=` so
    // the user lands back where they were. Guard against loops in case
    // /login itself fails.
    if (res.status === 401 && typeof window !== 'undefined' && !AUTH_PATHS.has(path)) {
      const w = window as Window & { __jobabAuthBounced?: boolean };
      if (!w.__jobabAuthBounced) {
        w.__jobabAuthBounced = true;
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.replace(`/login?next=${next}&reason=expired`);
      }
    }
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, path, body);
  }
  // 204 no-content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, public path: string, public body: string) {
    super(`${path} → ${status}`);
  }
}

export interface CurrentUser {
  userId: string;
  email: string;
  name: string | null;
  memberships: Array<{ id: string; organizationId: string; role: 'owner' | 'admin' | 'agent' }>;
}

export interface MemberRow {
  id: string;
  role: 'owner' | 'admin' | 'agent';
  user: { id: string; email: string; name: string | null };
  createdAt: string;
}

export interface InviteRow {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'agent';
  expiresAt: string;
  createdAt: string;
}

export interface CommentRow {
  id: string;
  postId: string;
  commenterName: string | null;
  content: string;
  intent: 'price' | 'buy' | 'question' | 'other' | 'spam' | null;
  intentConfidence: number | null;
  publicReplySent: boolean;
  publicReplyText: string | null;
  privateReplySent: boolean;
  privateReply: { id: string; externalUserId: string; customerName: string | null } | null;
  createdAt: string;
}

export interface CommentRule {
  intent: 'price' | 'buy' | 'question' | 'other' | 'spam';
  replyMode: 'ai' | 'manual' | 'off';
  publicTemplate: string | null;
  privateAllowed: boolean;
}

export const api = {
  // ─── auth ──────────────────────────────────────────────────────────────
  me: () => fetcher<CurrentUser>('/auth/me'),
  login: (email: string, password: string) =>
    fetcher<CurrentUser>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: () => fetcher<unknown>('/auth/logout', { method: 'POST' }),
  signUp: (body: { email: string; password: string; name: string; organizationName: string }) =>
    fetcher<CurrentUser>('/auth/sign-up', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  inspectInvite: (token: string) =>
    fetcher<{
      email: string;
      role: 'owner' | 'admin' | 'agent';
      organizationName: string;
      invitedBy: string;
      expiresAt: string;
    }>(`/auth/invites/inspect?token=${encodeURIComponent(token)}`),
  setActiveOrg: (organizationId: string) =>
    fetcher<unknown>('/auth/active-org', {
      method: 'POST',
      body: JSON.stringify({ organizationId }),
    }),
  acceptInvite: (token: string, name: string, password: string) =>
    fetcher<unknown>('/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, name, password }),
    }),

  // ─── conversations ─────────────────────────────────────────────────────
  listConversations: () => fetcher<ConversationListItem[]>('/conversations'),
  getConversation: (id: string) => fetcher<ConversationDetail>(`/conversations/${id}`),
  takeOver: (id: string) => fetcher<unknown>(`/conversations/${id}/takeover`, { method: 'POST' }),
  handBack: (id: string) => fetcher<unknown>(`/conversations/${id}/hand-back`, { method: 'POST' }),
  reply: (id: string, text: string) =>
    fetcher<unknown>(`/conversations/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  assertProduct: (id: string, productId: string) =>
    fetcher<{ ok: boolean; productTitle: string }>(`/conversations/${id}/assert-product`, {
      method: 'POST',
      body: JSON.stringify({ productId }),
    }),
  conversationActivity: (id: string, limit = 50) =>
    fetcher<ConversationActivityItem[]>(`/conversations/${id}/activity?limit=${limit}`),
  addConversationTag: (id: string, tagId: string) =>
    fetcher<{ ok: boolean }>(`/conversations/${id}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tagId }),
    }),
  removeConversationTag: (id: string, tagId: string) =>
    fetcher<{ ok: boolean }>(`/conversations/${id}/tags/${tagId}`, { method: 'DELETE' }),
  conversationNotes: (id: string) => fetcher<Note[]>(`/conversations/${id}/notes`),
  addConversationNote: (id: string, body: string) =>
    fetcher<Note>(`/conversations/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }),
  deleteConversationNote: (id: string, noteId: string) =>
    fetcher<{ ok: boolean }>(`/conversations/${id}/notes/${noteId}`, { method: 'DELETE' }),

  // ─── tags ──────────────────────────────────────────────────────────────
  listTags: () => fetcher<Tag[]>('/tags'),
  createTag: (name: string, color?: string) =>
    fetcher<Tag>('/tags', { method: 'POST', body: JSON.stringify({ name, color }) }),
  updateTag: (id: string, patch: { name?: string; color?: string }) =>
    fetcher<Tag>(`/tags/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteTag: (id: string) => fetcher<{ ok: boolean }>(`/tags/${id}`, { method: 'DELETE' }),

  // ─── orders ────────────────────────────────────────────────────────────
  listOrders: (q?: { status?: string; payment?: string }) => {
    const usp = new URLSearchParams();
    if (q?.status) usp.set('status', q.status);
    if (q?.payment) usp.set('payment', q.payment);
    const s = usp.toString();
    return fetcher<OrderListItem[]>(`/orders${s ? '?' + s : ''}`);
  },
  orderDetail: (id: string) => fetcher<OrderListItem>(`/orders/${id}`),
  orderForConversation: (id: string) => fetcher<Order | null>(`/orders?conversationId=${id}`),
  setOrderStatus: (
    id: string,
    status: 'created' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled',
    opts: { notifyCustomer?: boolean; trackingNote?: string } = {},
  ) =>
    fetcher<Order>(`/orders/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...opts }),
    }),
  markOrderPaid: (id: string) => fetcher<Order>(`/orders/${id}/mark-paid`, { method: 'POST' }),

  // ─── catalog ───────────────────────────────────────────────────────────
  listProducts: (q?: string) =>
    fetcher<Product[]>(`/catalog/products${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  getProduct: (id: string) => fetcher<Product>(`/catalog/products/${id}`),
  syncCsv: (csv: string) =>
    fetcher<{ products: number; variants: number }>(`/catalog/sync/csv`, {
      method: 'POST',
      body: JSON.stringify({ csv }),
    }),
  syncShopify: (creds: { shop: string; accessToken: string }) =>
    fetcher<{ products: number; variants: number }>(`/catalog/sync/shopify`, {
      method: 'POST',
      body: JSON.stringify(creds),
    }),
  syncWoo: (creds: { siteUrl: string; consumerKey: string; consumerSecret: string }) =>
    fetcher<{ products: number; variants: number }>(`/catalog/sync/woocommerce`, {
      method: 'POST',
      body: JSON.stringify(creds),
    }),
  setVariantStock: (variantId: string, stockQty: number) =>
    fetcher<{ id: string; stockQty: number }>(`/catalog/variants/${variantId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ stockQty }),
    }),

  // ─── analytics / settings / onboarding ─────────────────────────────────
  analytics: (days = 7) => fetcher<AnalyticsSummary>(`/analytics/summary?days=${days}`),
  getSettings: () => fetcher<SettingsPayload>('/settings'),
  updateSettings: (body: { name?: string; aiInstructions?: string; notificationPhone?: string | null }) =>
    fetcher<SettingsPayload>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  onboardingStatus: () => fetcher<OnboardingStatus>('/onboarding/status'),
  connectPage: (body: { externalPageId: string; accessToken: string; platform?: string }) =>
    fetcher<unknown>('/onboarding/pages', { method: 'POST', body: JSON.stringify(body) }),

  // ─── team ──────────────────────────────────────────────────────────────
  listMembers: () => fetcher<MemberRow[]>('/team/members'),
  listInvites: () => fetcher<InviteRow[]>('/team/invites'),
  createInvite: (email: string, role: 'owner' | 'admin' | 'agent') =>
    fetcher<{ invite: InviteRow; token: string }>('/team/invites', {
      method: 'POST',
      body: JSON.stringify({ email, role }),
    }),
  revokeInvite: (id: string) =>
    fetcher<unknown>(`/team/invites/${id}`, { method: 'DELETE' }),
  removeMember: (id: string) =>
    fetcher<unknown>(`/team/members/${id}`, { method: 'DELETE' }),
  assignConversation: (conversationId: string, assigneeUserId: string | null) =>
    fetcher<unknown>('/team/assign', {
      method: 'PATCH',
      body: JSON.stringify({ conversationId, assigneeUserId }),
    }),

  // ─── comments ──────────────────────────────────────────────────────────
  listComments: (q?: { intent?: string; postId?: string }) => {
    const usp = new URLSearchParams();
    if (q?.intent) usp.set('intent', q.intent);
    if (q?.postId) usp.set('postId', q.postId);
    const s = usp.toString();
    return fetcher<CommentRow[]>(`/comments${s ? '?' + s : ''}`);
  },
  listCommentRules: () => fetcher<CommentRule[]>('/comments/rules'),
  updateCommentRule: (intent: string, body: Partial<CommentRule>) =>
    fetcher<CommentRule>(`/comments/rules/${intent}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
};
