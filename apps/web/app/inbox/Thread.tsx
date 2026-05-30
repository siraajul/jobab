'use client';

import { useEffect, useRef, useState } from 'react';
import { Composer } from '@/components/inbox/Composer';
import { MessageBubble } from '@/components/inbox/MessageBubble';
import { TagBar } from '@/components/inbox/TagBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { usePrevious } from '@/lib/use-poll';
import type { MemberRow } from '@/lib/api';
import type { ConversationDetail, ConversationTag, Tag } from '@/lib/types';
import { HandoffBanner } from './HandoffBanner';
import { ThreadHeader } from './ThreadHeader';

/**
 * Open-conversation panel. Owns:
 *  - the auto-scroll behaviour as new messages arrive,
 *  - the "AI thinking" heuristic,
 *  - the customer-view toggle (filters merchant-internal lines).
 *
 * Header / tag bar / handoff banner / composer are each their own component.
 */
export function Thread({
  active,
  aiDraft,
  members,
  palette,
  onBack,
  onTakeOver,
  onHandBack,
  onAssign,
  onAddTag,
  onRemoveTag,
  onCreateTag,
  onSend,
  onPickCandidate,
  onOpenOrder,
  hasOrder,
}: {
  active: ConversationDetail;
  aiDraft: string | null;
  members: MemberRow[];
  palette: Tag[];
  onBack: () => void;
  onTakeOver: () => void;
  onHandBack: () => void;
  onAssign: (userId: string | null) => void;
  onAddTag: (tag: ConversationTag) => void;
  onRemoveTag: (tagId: string) => void;
  onCreateTag: (name: string, color: string) => void;
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
        members={members}
        onBack={onBack}
        onTakeOver={onTakeOver}
        onHandBack={onHandBack}
        onAssign={onAssign}
        customerView={customerView}
        onToggleCustomerView={() => setCustomerView((v) => !v)}
      />

      <TagBar
        tags={active.tags ?? []}
        palette={palette}
        onAdd={onAddTag}
        onRemove={onRemoveTag}
        onCreate={onCreateTag}
      />

      {active.handoffCategory && <HandoffBanner active={active} />}

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
