'use client';

import { cn } from '@/lib/cn';
import type { OrderStatus } from './useOrdersState';

/**
 * Tiny visual primitives for an order card:
 *   - `StatusChip` — derives a single coloured pill from `(status, payment)`.
 *   - `NextStatusButton` — the action button that moves an order through its
 *     lifecycle, with a notify-customer dropdown for ship / deliver.
 *   - `Chip` — the base coloured pill used by `StatusChip`.
 */

export function StatusChip({
  status,
  payment,
}: {
  status: OrderStatus;
  payment: 'pending' | 'paid' | 'failed';
}) {
  if (status === 'delivered') return <Chip tone="paid">Delivered</Chip>;
  if (status === 'shipped') return <Chip tone="accent">Shipped</Chip>;
  if (status === 'cancelled') return <Chip tone="red">Cancelled</Chip>;
  if (payment === 'paid' && status === 'confirmed')
    return <Chip tone="paid">Paid · ready to ship</Chip>;
  if (payment === 'paid') return <Chip tone="paid">Paid</Chip>;
  if (status === 'confirmed') return <Chip tone="accent">Confirmed</Chip>;
  return <Chip tone="amber">Awaiting payment</Chip>;
}

export function NextStatusButton({
  status,
  onClick,
}: {
  status: OrderStatus;
  onClick: (notify: boolean, note?: string) => void;
}) {
  const label =
    status === 'shipped'
      ? 'Mark shipped'
      : status === 'delivered'
        ? 'Mark delivered'
        : status === 'confirmed'
          ? 'Confirm'
          : status === 'cancelled'
            ? 'Cancel'
            : status;

  const isShipOrDeliver = status === 'shipped' || status === 'delivered';

  if (!isShipOrDeliver) {
    return (
      <button
        onClick={() => onClick(false)}
        className="rounded-lg border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
      >
        {label}
      </button>
    );
  }
  return (
    <details className="relative inline-block">
      <summary className="cursor-pointer list-none rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110">
        {label} ▾
      </summary>
      <div className="absolute right-0 z-10 mt-1 w-64 rounded-xl border border-border-2 bg-surface p-3 shadow-md">
        <button
          onClick={(e) => {
            (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
            onClick(true);
          }}
          className="block w-full rounded-lg bg-accent px-3 py-2 text-left text-[13px] font-semibold text-white"
        >
          {label} + notify customer
        </button>
        <button
          onClick={(e) => {
            (e.currentTarget.closest('details') as HTMLDetailsElement).open = false;
            onClick(false);
          }}
          className="mt-1 block w-full rounded-lg border border-border-2 bg-surface-2 px-3 py-2 text-left text-[13px] font-semibold text-ink-2"
        >
          {label} (silently)
        </button>
      </div>
    </details>
  );
}

function Chip({
  tone,
  children,
}: {
  tone: 'paid' | 'accent' | 'amber' | 'red';
  children: React.ReactNode;
}) {
  const styles = {
    paid: 'bg-paid-bg text-paid',
    accent: 'bg-accent-soft text-accent-ink',
    amber: 'bg-amber-bg text-amber',
    red: 'bg-red-bg text-red',
  } as const;
  return (
    <span
      className={cn(
        'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em]',
        styles[tone],
      )}
    >
      {children}
    </span>
  );
}
