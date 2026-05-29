'use client';

import { useEffect, useRef, useState } from 'react';
import { NavRail } from '@/components/layout/NavRail';
import { Drawer } from '@/components/inbox/Drawer';
import { useToast } from '@/components/shared/Toast';
import { useTabBadge } from '@/lib/use-tab-badge';
import { api } from '@/lib/api';
import { MobileNav, type MobileView } from '@/components/inbox/MobileNav';
import { OrderPanel } from '@/components/inbox/OrderPanel';
import { EmptyState } from '@/components/shared/EmptyState';
import type {
  ConversationDetail,
  ConversationListItem,
  Order,
} from '@/lib/types';
import { ConversationList } from './ConversationList';
import { Thread } from './Thread';
import { useInboxState } from './useInboxState';

/**
 * The Inbox orchestrator. State + mutations + polling live in `useInboxState`;
 * this file owns layout and view switching only.
 */
export function InboxClient({
  initialConversations,
  initialThreads,
  initialOrders,
}: {
  initialConversations: ConversationListItem[];
  initialThreads: Record<string, ConversationDetail>;
  initialOrders: Record<string, Order | null>;
}) {
  const state = useInboxState({
    conversations: initialConversations,
    threads: initialThreads,
    orders: initialOrders,
  });

  const toast = useToast();
  const [mobileView, setMobileView] = useState<MobileView>('list');
  const [orderDrawer, setOrderDrawer] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useTabBadge(state.counts.needs);

  const onPickCandidate = async (productId: string) => {
    if (!state.activeId) return;
    try {
      const r = await api.assertProduct(state.activeId, productId);
      toast('success', `Confirmed "${r.productTitle}" — AI will follow up.`);
    } catch {
      toast('error', "Couldn't confirm — try again.");
    }
  };

  const selectConversation = (id: string) => {
    state.setActiveId(id);
    setMobileView('thread');
  };

  // Keyboard shortcuts (desktop). Skip when focus is in an input/textarea so
  // the user can type in the composer / search without surprises.
  useEffect(() => {
    const inTextField = () => {
      const a = document.activeElement as HTMLElement | null;
      if (!a) return false;
      const tag = a.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || a.isContentEditable;
    };
    const onKey = (e: KeyboardEvent) => {
      // ⌘/ or Ctrl+/ → focus search
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (inTextField()) return;
      // Escape returns to list on mobile
      if (e.key === 'Escape' && mobileView !== 'list') {
        setMobileView('list');
        return;
      }
      // j / k navigate
      if (e.key === 'j' || e.key === 'k') {
        const list = state.filtered;
        if (list.length === 0) return;
        e.preventDefault();
        const idx = list.findIndex((c) => c.id === state.activeId);
        const next = e.key === 'j' ? Math.min(list.length - 1, idx + 1) : Math.max(0, idx - 1);
        const target = list[next === -1 ? 0 : next];
        if (target) state.setActiveId(target.id);
      }
      // Enter opens the active conversation (mobile expands)
      if (e.key === 'Enter' && state.activeId) {
        setMobileView('thread');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state.filtered, state.activeId, state.setActiveId, mobileView]);

  return (
    <div className="grid h-[100dvh] grid-rows-[1fr_auto] xl:grid-rows-1 xl:grid-cols-[84px_minmax(320px,380px)_minmax(0,1fr)_minmax(360px,440px)]">
      <div className="hidden xl:block">
        <NavRail />
      </div>

      <aside
        className={
          'relative flex min-h-0 flex-col border-r border-border bg-bg xl:flex ' +
          (mobileView === 'list' ? 'flex' : 'hidden')
        }
      >
        <ConversationList
          counts={state.counts}
          filtered={state.filtered}
          filter={state.filter}
          setFilter={state.setFilter}
          sort={state.sort}
          setSort={state.setSort}
          query={state.query}
          setQuery={state.setQuery}
          activeId={state.activeId}
          selectConversation={selectConversation}
          searchRef={searchRef}
        />
      </aside>

      <main
        className={
          'flex min-h-0 flex-col bg-bg ' +
          (mobileView === 'thread' ? 'flex' : 'hidden xl:flex')
        }
      >
        {state.active ? (
          <Thread
            active={state.active}
            aiDraft={state.aiDraft}
            onBack={() => setMobileView('list')}
            onTakeOver={state.takeOver}
            onHandBack={state.handBack}
            onSend={state.send}
            onPickCandidate={onPickCandidate}
            onOpenOrder={() => {
              if (typeof window !== 'undefined' && window.innerWidth >= 1280) return;
              setOrderDrawer(true);
            }}
            hasOrder={!!state.activeOrder}
          />
        ) : (
          <EmptyState
            title="Pick a conversation"
            body="Tap any conversation on the left to open the thread, take over from the AI, and watch the order assemble."
            hint="The receipt panel appears as the AI builds an order"
          />
        )}
      </main>

      <aside className="hidden min-h-0 overflow-hidden bg-bg xl:block">
        {state.active ? (
          <OrderPanel conversation={state.active} order={state.activeOrder} />
        ) : (
          <EmptyState title="No order yet" body="Select a conversation to see its live receipt." />
        )}
      </aside>

      <Drawer
        open={orderDrawer || (mobileView === 'order' && !!state.active)}
        onClose={() => {
          setOrderDrawer(false);
          if (mobileView === 'order') setMobileView('thread');
        }}
        title="Live receipt"
      >
        {state.active ? (
          <OrderPanel conversation={state.active} order={state.activeOrder} />
        ) : null}
      </Drawer>

      <MobileNav
        view={mobileView}
        onChange={setMobileView}
        needs={state.counts.needs}
        threadEnabled={!!state.active}
        orderEnabled={!!state.active}
      />
    </div>
  );
}
