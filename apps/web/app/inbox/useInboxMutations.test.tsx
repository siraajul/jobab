import { act, renderHook, waitFor } from '@testing-library/react';
import { ReactNode, useState } from 'react';
import { ToastProvider } from '@/components/shared/Toast';
import { useInboxMutations } from './useInboxMutations';
import type { ConversationListItem } from '@/lib/types';

// Mock the API client module — faster + more deterministic than network-level
// mocking for hook unit tests. Per-test we override individual methods with
// `jest.spyOn(api, ...)` or `(api.xyz as jest.Mock).mockImplementation(...)`.
jest.mock('@/lib/api', () => ({
  api: {
    takeOver: jest.fn(async () => ({ ok: true })),
    handBack: jest.fn(async () => ({ ok: true })),
    assignConversation: jest.fn(async () => ({ ok: true })),
    addConversationTag: jest.fn(async () => ({ ok: true })),
    removeConversationTag: jest.fn(async () => ({ ok: true })),
    createTag: jest.fn(async () => ({ id: 't', name: 'x', color: 'red' })),
    reply: jest.fn(async () => ({ ok: true })),
  },
}));

import { api } from '@/lib/api';

const baseConv = (over: Partial<ConversationListItem> = {}): ConversationListItem =>
  ({
    id: 'c1',
    organizationId: 'org1',
    pageId: 'p1',
    externalUserId: 'u1',
    customerName: 'Tahmina',
    customerPhone: null,
    customerAddress: null,
    status: 'bot',
    assignedUserId: null,
    handoffCategory: null,
    handoffReason: null,
    lastCustomerMessageAt: '2026-01-01T10:00:00Z',
    page: { id: 'p1', platform: 'facebook', name: 'Page A' },
    tags: [],
    createdAt: '2026-01-01T09:00:00Z',
    updatedAt: '2026-01-01T10:00:00Z',
    ...over,
  }) as unknown as ConversationListItem;

function wrapper({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}

function useHarness(initial: ConversationListItem[]) {
  const [conversations, setConversations] = useState(initial);
  const [threads, setThreads] = useState<Record<string, unknown>>({});
  const [tags, setTags] = useState<unknown[]>([]);
  const m = useInboxMutations({
    activeId: initial[0]?.id ?? null,
    conversations,
    members: [],
    setConversations,
    setThreads: setThreads as any,
    setTags: setTags as any,
  });
  return { conversations, threads, tags, ...m };
}

describe('useInboxMutations.takeOver', () => {
  beforeEach(() => jest.clearAllMocks());

  it('optimistically flips status to human, persists on success', async () => {
    const { result } = renderHook(() => useHarness([baseConv()]), { wrapper });

    await act(async () => {
      await result.current.takeOver();
    });

    expect(result.current.conversations[0].status).toBe('human');
    expect(api.takeOver).toHaveBeenCalledWith('c1');
  });

  it('rolls back to bot if the API call fails', async () => {
    (api.takeOver as jest.Mock).mockRejectedValueOnce(new Error('500'));
    const { result } = renderHook(() => useHarness([baseConv()]), { wrapper });

    await act(async () => {
      await result.current.takeOver();
    });

    await waitFor(() => expect(result.current.conversations[0].status).toBe('bot'));
  });
});
