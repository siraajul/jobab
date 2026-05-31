import { isProblemCategory } from '@/lib/handoff';
import type { ConversationListItem } from '@/lib/types';

export type Filter = 'all' | 'needs' | 'complaints' | 'ai' | 'you';
export type Sort = 'recent' | 'urgent' | 'oldest';
export type ChannelFilter = 'all' | 'facebook' | 'instagram' | 'whatsapp';

// needs_human first, then human, then bot, then everything else.
export function statusPriority(status: string): number {
  if (status === 'needs_human') return 0;
  if (status === 'human') return 1;
  if (status === 'bot') return 2;
  return 3;
}

function lastCustomerTs(c: ConversationListItem): number {
  return c.lastCustomerMessageAt ? new Date(c.lastCustomerMessageAt).getTime() : 0;
}

export function applyFilters(
  list: ConversationListItem[],
  opts: { filter: Filter; sort: Sort; channel: ChannelFilter; query: string },
): ConversationListItem[] {
  const q = opts.query.trim().toLowerCase();
  const matched = list.filter((c) => {
    if (opts.filter === 'needs' && c.status !== 'needs_human') return false;
    if (opts.filter === 'complaints' && !isProblemCategory(c.handoffCategory)) return false;
    if (opts.filter === 'ai' && c.status !== 'bot') return false;
    if (opts.filter === 'you' && c.status !== 'human') return false;
    if (opts.channel !== 'all' && c.page?.platform !== opts.channel) return false;
    if (q && !(c.customerName ?? '').toLowerCase().includes(q)) return false;
    return true;
  });
  switch (opts.sort) {
    case 'urgent':
      // needs_human first, then oldest-needs-first (longest waiting), then the rest by recency
      return [...matched].sort((a, b) => {
        const sp = statusPriority(a.status) - statusPriority(b.status);
        if (sp !== 0) return sp;
        if (a.status === 'needs_human' && b.status === 'needs_human')
          return lastCustomerTs(a) - lastCustomerTs(b);
        return lastCustomerTs(b) - lastCustomerTs(a);
      });
    case 'oldest':
      return [...matched].sort((a, b) => lastCustomerTs(a) - lastCustomerTs(b));
    case 'recent':
    default:
      return [...matched].sort((a, b) => lastCustomerTs(b) - lastCustomerTs(a));
  }
}

export function computeCounts(list: ConversationListItem[]) {
  let needs = 0;
  let ai = 0;
  let you = 0;
  let complaints = 0;
  for (const c of list) {
    if (c.status === 'needs_human') needs++;
    else if (c.status === 'bot') ai++;
    else if (c.status === 'human') you++;
    if (isProblemCategory(c.handoffCategory)) complaints++;
  }
  return { needs, ai, you, complaints };
}

export function computeChannelCounts(list: ConversationListItem[]) {
  const c = { facebook: 0, instagram: 0, whatsapp: 0 };
  for (const conv of list) {
    const p = conv.page?.platform;
    if (p === 'facebook' || p === 'instagram' || p === 'whatsapp') c[p]++;
  }
  return c;
}

export function sameOrder(a: ConversationListItem[], b: ConversationListItem[]) {
  return a.length === b.length && a.every((c, i) => c.id === b[i].id);
}
