import {
  applyFilters,
  computeCounts,
  computeChannelCounts,
  sameOrder,
  statusPriority,
} from './filters';
import type { ConversationListItem } from '@/lib/types';

const conv = (over: Partial<ConversationListItem>): ConversationListItem =>
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

describe('statusPriority', () => {
  it('orders needs_human → human → bot → other', () => {
    expect(statusPriority('needs_human')).toBeLessThan(statusPriority('human'));
    expect(statusPriority('human')).toBeLessThan(statusPriority('bot'));
    expect(statusPriority('bot')).toBeLessThan(statusPriority('closed'));
  });
});

describe('applyFilters', () => {
  const list = [
    conv({ id: 'a', status: 'needs_human', lastCustomerMessageAt: '2026-01-01T10:00:00Z' }),
    conv({ id: 'b', status: 'needs_human', lastCustomerMessageAt: '2026-01-01T08:00:00Z' }),
    conv({ id: 'c', status: 'bot', lastCustomerMessageAt: '2026-01-01T12:00:00Z' }),
    conv({ id: 'd', status: 'human', lastCustomerMessageAt: '2026-01-01T11:00:00Z' }),
  ];

  it('filter=needs returns only needs_human', () => {
    const out = applyFilters(list, { filter: 'needs', sort: 'recent', channel: 'all', query: '' });
    expect(out.map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('sort=urgent puts oldest-waiting needs_human first', () => {
    const out = applyFilters(list, { filter: 'all', sort: 'urgent', channel: 'all', query: '' });
    // needs_human first, oldest-first within them
    expect(out.slice(0, 2).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('sort=recent puts newest first regardless of status', () => {
    const out = applyFilters(list, { filter: 'all', sort: 'recent', channel: 'all', query: '' });
    expect(out[0].id).toBe('c');
  });

  it('channel filter narrows by platform', () => {
    const mixed = [
      ...list,
      conv({ id: 'e', page: { id: 'p2', platform: 'whatsapp', name: 'wa' } as never }),
    ];
    const out = applyFilters(mixed, {
      filter: 'all',
      sort: 'recent',
      channel: 'whatsapp',
      query: '',
    });
    expect(out.map((c) => c.id)).toEqual(['e']);
  });

  it('query matches customer name case-insensitively', () => {
    const out = applyFilters(list, {
      filter: 'all',
      sort: 'recent',
      channel: 'all',
      query: 'TAHMINA',
    });
    expect(out).toHaveLength(list.length);
  });
});

describe('computeCounts', () => {
  it('counts statuses and complaint category', () => {
    const list = [
      conv({ status: 'needs_human', handoffCategory: 'complaint' as never }),
      conv({ status: 'bot' }),
      conv({ status: 'human' }),
    ];
    const c = computeCounts(list);
    expect(c).toMatchObject({ needs: 1, ai: 1, you: 1, complaints: 1 });
  });
});

describe('computeChannelCounts', () => {
  it('counts per platform', () => {
    const list = [
      conv({ page: { id: 'p1', platform: 'facebook', name: 'a' } as never }),
      conv({ page: { id: 'p2', platform: 'instagram', name: 'b' } as never }),
      conv({ page: { id: 'p3', platform: 'whatsapp', name: 'c' } as never }),
    ];
    expect(computeChannelCounts(list)).toEqual({ facebook: 1, instagram: 1, whatsapp: 1 });
  });
});

describe('sameOrder', () => {
  it('returns true only when ids match by index', () => {
    const a = [conv({ id: '1' }), conv({ id: '2' })];
    const b = [conv({ id: '1' }), conv({ id: '2' })];
    const c = [conv({ id: '2' }), conv({ id: '1' })];
    expect(sameOrder(a, b)).toBe(true);
    expect(sameOrder(a, c)).toBe(false);
  });
});
