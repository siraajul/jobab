'use client';

import Link from 'next/link';
import { JamdaniMark } from '@/components/shared/Jamdani';
import type { OrderListItem } from '@/lib/types';
import { NextStatusButton, StatusChip } from './StatusChip';
import type { OrderStatus } from './useOrdersState';

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  created: ['confirmed', 'shipped', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

/**
 * One row of the orders list. Stateless — every mutation is delegated up so
 * the card can be rendered offline / in tests without a network.
 */
export function OrderCard({
  order,
  onPrint,
  onMarkPaid,
  onSetStatus,
}: {
  order: OrderListItem;
  onPrint: () => void;
  onMarkPaid: (id: string) => void;
  onSetStatus: (
    id: string,
    s: OrderStatus,
    opts?: { notifyCustomer?: boolean; trackingNote?: string },
  ) => void;
}) {
  const nextStatuses = NEXT_STATUS[order.status as OrderStatus] ?? [];
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((acc, i) => acc + i.qty, 0);
  const created = new Date(order.createdAt);

  return (
    <article className="rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <JamdaniMark size={14} className="text-accent" />
          <div className="font-display text-[15px] font-bold uppercase tracking-[0.18em] text-accent-ink">
            Jobab · #{order.id.slice(-6).toUpperCase()}
          </div>
          <StatusChip status={order.status as OrderStatus} payment={order.paymentStatus} />
        </div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
          {created.toLocaleDateString()} ·{' '}
          {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="min-w-0">
          <div className="font-display text-[16px] font-semibold tracking-display">
            {order.customerName}
          </div>
          <div className="text-[12.5px] text-ink-2">
            {order.customerPhone} · {order.customerAddress || 'address pending'}
          </div>
          <div className="mt-1 text-[12.5px] text-ink-3">
            {itemCount} item{itemCount !== 1 ? 's' : ''}
            {order.conversation?.customerName
              ? ` · conversation ${order.conversation.customerName}`
              : ''}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
              Total
            </div>
            <div className="font-display text-[26px] font-bold leading-none tabular-nums tracking-display">
              ৳{Number(order.total).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-b-2xl border-t border-border bg-surface-2 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
          {order.paymentLink ? (
            <a
              className="truncate text-accent-ink hover:underline"
              href={order.paymentLink}
              target="_blank"
              rel="noreferrer"
            >
              Payment link
            </a>
          ) : (
            <span className="text-ink-3">No payment link yet</span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
          {order.paymentStatus !== 'paid' && (
            <button
              onClick={() => onMarkPaid(order.id)}
              className="rounded-lg bg-paid px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Mark paid
            </button>
          )}
          {nextStatuses.map((next) => (
            <NextStatusButton
              key={next}
              status={next}
              onClick={(notify, note) =>
                onSetStatus(order.id, next, { notifyCustomer: notify, trackingNote: note })
              }
            />
          ))}
          <button
            onClick={onPrint}
            className="rounded-lg border border-border-2 bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
            aria-label="Print order"
            title="Print this order receipt"
          >
            Print
          </button>
          {order.conversation && (
            <Link
              href={`/inbox?c=${order.conversation.id}`}
              className="rounded-lg border border-border-2 bg-surface px-2.5 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              Open chat
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
