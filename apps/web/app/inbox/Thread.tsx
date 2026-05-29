'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { Composer } from '@/components/inbox/Composer';
import { MessageBubble } from '@/components/inbox/MessageBubble';
import { StatusPill } from '@/components/inbox/StatusPill';
import { TakeoverToggle } from '@/components/inbox/TakeoverToggle';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { usePrevious } from '@/lib/use-poll';
import type { ConversationDetail } from '@/lib/types';

export function Thread({
  active,
  aiDraft,
  onBack,
  onTakeOver,
  onHandBack,
  onSend,
  onPickCandidate,
  onOpenOrder,
  hasOrder,
}: {
  active: ConversationDetail;
  aiDraft: string | null;
  onBack: () => void;
  onTakeOver: () => void;
  onHandBack: () => void;
  onSend: (text: string) => Promise<void>;
  onPickCandidate: (productId: string) => void;
  onOpenOrder: () => void;
  hasOrder: boolean;
}) {
  const [customerView, setCustomerView] = useState(false);
  // Auto-scroll to the bottom when new messages arrive; snap when switching.
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const lastLen = usePrevious(active.messages.length);
  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    if (lastLen !== undefined && active.messages.length > lastLen) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    } else {
      el.scrollTop = el.scrollHeight;
    }
  }, [active.id, active.messages.length, lastLen]);

  // Pulse "AI thinking" while the most-recent message is from the customer
  // and less than 8s old (heuristic — the worker typically replies in ~2s).
  const lastMsg = active.messages[active.messages.length - 1];
  const thinking =
    active.status === 'bot' &&
    lastMsg?.sender === 'customer' &&
    Date.now() - new Date(lastMsg.createdAt).getTime() < 8000;

  // "Customer view" filters out merchant-side context lines like
  // [from comment on post …] that the customer would never see.
  const displayed = customerView
    ? active.messages.filter((m) => m.direction === 'out')
    : active.messages;

  return (
    <>
      <ThreadHeader
        active={active}
        onBack={onBack}
        onTakeOver={onTakeOver}
        onHandBack={onHandBack}
        customerView={customerView}
        onToggleCustomerView={() => setCustomerView((v) => !v)}
      />

      <div
        ref={messagesRef}
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5"
        aria-live="polite"
      >
        {displayed.length === 0 ? (
          <EmptyState
            title={customerView ? 'Nothing customer-facing yet' : 'No messages yet'}
            body={
              customerView
                ? "The customer hasn't received any AI replies on this conversation."
                : 'Waiting for the customer to open the conversation.'
            }
          />
        ) : (
          <>
            {displayed.map((m) => (
              <MessageBubble
                key={m.id}
                sender={m.sender}
                attachments={m.attachments}
                onPickCandidate={onPickCandidate}
              >
                {customerView ? stripInternalTags(m.content) : m.content}
              </MessageBubble>
            ))}
            {thinking && <ThinkingIndicator />}
          </>
        )}
      </div>

      {hasOrder && (
        <button
          type="button"
          onClick={onOpenOrder}
          className="mx-3 mb-2 flex items-center justify-center gap-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px] font-semibold text-accent-ink shadow-sm transition hover:brightness-105 sm:mx-6 xl:hidden"
        >
          <JamdaniMark size={12} />
          View live receipt
        </button>
      )}

      <Composer
        status={active.status}
        onSend={onSend}
        thinking={thinking}
        aiDraft={active.status === 'human' ? aiDraft : null}
      />
    </>
  );
}

/** Strip internal tags like "[from comment on post …]" so the merchant sees
 *  exactly what the customer received. */
function stripInternalTags(text: string): string {
  return text
    .replace(/^\[from comment on post[^\]]*\]\s*/i, '')
    .replace(/^\[customer sent[^\]]*\]\s*/i, '')
    .replace(/\[customer image[^\]]*\]\s*/gi, '');
}

function ThreadHeader({
  active,
  onBack,
  onTakeOver,
  onHandBack,
  customerView,
  onToggleCustomerView,
}: {
  active: ConversationDetail;
  onBack: () => void;
  onTakeOver: () => void;
  onHandBack: () => void;
  customerView: boolean;
  onToggleCustomerView: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2.5 border-b border-border bg-surface px-3 py-3 sm:gap-3 sm:px-6 sm:py-4">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 rounded-md p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink xl:hidden"
          aria-label="Back to inbox"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <Avatar name={active.customerName ?? 'Customer'} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="truncate font-display text-[16px] font-semibold tracking-display sm:text-[18px]">
              {active.customerName ?? active.externalUserId}
            </div>
            <JamdaniMark size={10} className="text-ink-3" />
          </div>
          <div className="truncate text-[11px] uppercase tracking-[0.14em] text-ink-3 sm:text-[12.5px]">
            Facebook · Rongdhonu Boutique
          </div>
        </div>
        <button
          type="button"
          onClick={onToggleCustomerView}
          title={customerView ? 'Showing what the customer sees — click to return to merchant view' : 'See exactly what the customer sees'}
          className={
            'hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition md:inline-flex ' +
            (customerView
              ? 'border-accent bg-accent-soft text-accent-ink'
              : 'border-border-2 bg-surface text-ink-2 hover:bg-surface-2')
          }
        >
          {customerView ? 'Customer view' : 'View as customer'}
        </button>
        <StatusPill status={active.status} pulse={active.status === 'bot'} />
        <div className="hidden md:block">
          <TakeoverToggle
            status={active.status}
            onTakeOver={onTakeOver}
            onHandBack={onHandBack}
          />
        </div>
      </div>
      <div className="border-b border-border bg-surface px-3 pb-3 md:hidden">
        <TakeoverToggle
          status={active.status}
          onTakeOver={onTakeOver}
          onHandBack={onHandBack}
        />
      </div>
    </>
  );
}

function ThinkingIndicator() {
  return (
    <div
      className="ml-0.5 inline-flex items-center gap-2 self-start text-[12px] text-ink-3 animate-jb-rise"
      role="status"
      aria-label="AI is thinking"
    >
      <span className="flex gap-1" aria-hidden>
        <span className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" />
        <span
          className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent"
          style={{ animationDelay: '0.3s' }}
        />
      </span>
      AI is thinking…
    </div>
  );
}
