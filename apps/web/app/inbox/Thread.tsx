'use client';

import { useEffect, useRef, useState } from 'react';
import { Avatar } from '@/components/shared/Avatar';
import { Composer } from '@/components/inbox/Composer';
import { MessageBubble } from '@/components/inbox/MessageBubble';
import { StatusPill } from '@/components/inbox/StatusPill';
import { TakeoverToggle } from '@/components/inbox/TakeoverToggle';
import { AssignMenu } from '@/components/inbox/AssignMenu';
import { ChannelBadge, channelLabel } from '@/components/inbox/ChannelBadge';
import { TagBar } from '@/components/inbox/TagBar';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { usePrevious } from '@/lib/use-poll';
import { handoffLabel, isProblemCategory } from '@/lib/handoff';
import type { MemberRow } from '@/lib/api';
import type { ConversationDetail, ConversationTag, Tag } from '@/lib/types';

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

function ThreadHeader({
  active,
  members,
  onBack,
  onTakeOver,
  onHandBack,
  onAssign,
  customerView,
  onToggleCustomerView,
}: {
  active: ConversationDetail;
  members: MemberRow[];
  onBack: () => void;
  onTakeOver: () => void;
  onHandBack: () => void;
  onAssign: (userId: string | null) => void;
  customerView: boolean;
  onToggleCustomerView: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border-b border-border bg-surface px-3 py-3 sm:gap-3 sm:px-6 sm:py-3.5">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 shrink-0 rounded-md p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink xl:hidden"
          aria-label="Back to inbox"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <Avatar name={active.customerName ?? 'Customer'} size={36} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <div className="truncate font-display text-[15px] font-semibold tracking-display sm:text-[17px]">
              {active.customerName ?? active.externalUserId}
            </div>
            <JamdaniMark size={10} className="shrink-0 text-ink-3" />
          </div>
          <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.14em] text-ink-3 sm:text-[12px]">
            <ChannelBadge platform={active.page?.platform} size={14} />
            <span className="truncate">{channelLabel(active.page?.platform)}</span>
          </div>
        </div>
        <div className="hidden lg:block">
          <AssignMenu
            members={members}
            assignedUserId={active.assignedUserId}
            onAssign={onAssign}
          />
        </div>
        <StatusPill status={active.status} pulse={active.status === 'bot'} />
        {/* Customer-view toggle — only renders where there's space (≥ lg).
            Below lg the same toggle ships in the secondary action row. */}
        <button
          type="button"
          onClick={onToggleCustomerView}
          title={customerView ? 'Showing the customer view — click to switch back' : 'See exactly what the customer sees'}
          aria-pressed={customerView}
          className={
            'hidden shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition lg:inline-flex ' +
            (customerView
              ? 'border-accent bg-accent-soft text-accent-ink'
              : 'border-border-2 bg-surface text-ink-2 hover:bg-surface-2')
          }
        >
          <EyeIcon /> {customerView ? 'Customer' : 'As customer'}
        </button>
        <div className="hidden md:block">
          <TakeoverToggle
            status={active.status}
            onTakeOver={onTakeOver}
            onHandBack={onHandBack}
          />
        </div>
      </div>
      {/* Secondary action row — mobile + tablet: take-over toggle, plus the
          customer-view chip when the header above couldn't fit it. */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 pb-3 md:hidden">
        <div className="flex items-center gap-2">
          <TakeoverToggle
            status={active.status}
            onTakeOver={onTakeOver}
            onHandBack={onHandBack}
          />
          <AssignMenu
            members={members}
            assignedUserId={active.assignedUserId}
            onAssign={onAssign}
          />
        </div>
        <button
          type="button"
          onClick={onToggleCustomerView}
          aria-pressed={customerView}
          className={
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ' +
            (customerView
              ? 'border-accent bg-accent-soft text-accent-ink'
              : 'border-border-2 bg-surface text-ink-2 hover:bg-surface-2')
          }
        >
          <EyeIcon /> {customerView ? 'Customer' : 'As customer'}
        </button>
      </div>
      {/* On md..lg (no space in header, no mobile row) we still need the
          customer-view chip somewhere. */}
      <div className="hidden items-center justify-end gap-2 border-b border-border bg-surface px-6 pb-3 md:flex lg:hidden">
        <AssignMenu
          members={members}
          assignedUserId={active.assignedUserId}
          onAssign={onAssign}
        />
        <button
          type="button"
          onClick={onToggleCustomerView}
          aria-pressed={customerView}
          className={
            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition ' +
            (customerView
              ? 'border-accent bg-accent-soft text-accent-ink'
              : 'border-border-2 bg-surface text-ink-2 hover:bg-surface-2')
          }
        >
          <EyeIcon /> {customerView ? 'Customer' : 'As customer'}
        </button>
      </div>
    </>
  );
}

/** A banner flagging why the AI handed this conversation off, so the merchant
 *  can follow up without scrolling the thread. Red for customer problems
 *  (complaint/refund/payment), amber for the softer reasons. */
function HandoffBanner({ active }: { active: ConversationDetail }) {
  const problem = isProblemCategory(active.handoffCategory);
  return (
    <div
      className={
        'flex items-start gap-2 border-b px-3 py-2 text-[12.5px] sm:px-6 ' +
        (problem
          ? 'border-red/30 bg-red-bg text-red'
          : 'border-amber/30 bg-amber-bg text-amber')
      }
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="mt-0.5 shrink-0" aria-hidden>
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <div className="min-w-0">
        <span className="font-bold uppercase tracking-wider">{handoffLabel(active.handoffCategory)}</span>
        {active.handoffReason && <span className="text-ink-2"> — {active.handoffReason}</span>}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
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
