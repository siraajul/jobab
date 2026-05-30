'use client';

import { Avatar } from '@/components/shared/Avatar';
import { AssignMenu } from '@/components/inbox/AssignMenu';
import { ChannelBadge, channelLabel } from '@/components/inbox/ChannelBadge';
import { StatusPill } from '@/components/inbox/StatusPill';
import { TakeoverToggle } from '@/components/inbox/TakeoverToggle';
import { JamdaniMark } from '@/components/shared/Jamdani';
import type { MemberRow } from '@/lib/api';
import type { ConversationDetail } from '@/lib/types';

/**
 * Header for an open conversation: avatar, name, channel, take-over toggle,
 * assignee menu, customer-view chip. Three responsive layouts:
 *
 *   ≥ lg : everything in one row
 *   md..lg: secondary row underneath for assign + customer-view chip
 *   < md  : compact + a mobile back button
 *
 * Stateless — every action is a callback up.
 */
export function ThreadHeader({
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
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
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
          title={
            customerView
              ? 'Showing the customer view — click to switch back'
              : 'See exactly what the customer sees'
          }
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
          <TakeoverToggle status={active.status} onTakeOver={onTakeOver} onHandBack={onHandBack} />
        </div>
      </div>
      {/* Secondary action row — mobile + tablet: take-over toggle, plus the
          customer-view chip when the header above couldn't fit it. */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-3 pb-3 md:hidden">
        <div className="flex items-center gap-2">
          <TakeoverToggle status={active.status} onTakeOver={onTakeOver} onHandBack={onHandBack} />
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
        <AssignMenu members={members} assignedUserId={active.assignedUserId} onAssign={onAssign} />
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

function EyeIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
