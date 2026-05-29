'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { usePoll } from '@/lib/use-poll';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OrderListItem } from '@/lib/types';

type Filter = 'all' | 'created' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
type OrderStatus = 'created' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'created', label: 'Created' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'paid', label: 'Paid' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  created: ['confirmed', 'shipped', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function OrdersClient({ initial }: { initial: OrderListItem[] }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');

  usePoll(async () => {
    try {
      setOrders(await api.listOrders());
    } catch { /* offline */ }
  }, 5000);

  const filtered = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'paid') return orders.filter((o) => o.paymentStatus === 'paid');
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const setStatus = async (
    id: string,
    status: OrderStatus,
    opts?: { notifyCustomer?: boolean; trackingNote?: string },
  ) => {
    try {
      const updated = await api.setOrderStatus(id, status, opts);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast(
        'success',
        opts?.notifyCustomer
          ? `Marked ${status} — customer notified.`
          : `Marked ${status}.`,
      );
    } catch {
      toast('error', "Couldn't update status.");
    }
  };

  const revenue = useMemo(
    () => orders
      .filter((o) => o.status !== 'cancelled')
      .reduce((acc, o) => acc + Number(o.total), 0),
    [orders],
  );

  const markPaid = async (id: string) => {
    try {
      const updated = await api.markOrderPaid(id);
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
      toast('success', 'Marked as paid.');
    } catch {
      toast('error', "Couldn't update — try again.");
    }
  };

  return (
    <AppShell
      title="Orders"
      subtitle={`${orders.length} total · ৳${revenue.toLocaleString()} revenue`}
      actions={<Link href="/inbox" className="rounded-full border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-2">Back to inbox</Link>}
    >
      {/* filters */}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition',
              filter === f.key
                ? 'bg-ink text-bg'
                : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No orders here"
          body={
            filter === 'all'
              ? "Orders will appear here as the AI assembles and confirms them. Try the inbox to see one in progress."
              : `No orders match "${filter}". Switch filter or wait for new orders.`
          }
        />
      ) : (
        <div className="grid gap-3 sm:gap-4">
          {filtered.map((o) => (
            <OrderCard
              key={o.id}
              order={o}
              onMarkPaid={markPaid}
              onSetStatus={setStatus}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function OrderCard({
  order,
  onMarkPaid,
  onSetStatus,
}: {
  order: OrderListItem;
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
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-dashed border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <JamdaniMark size={14} className="text-accent" />
          <div className="font-display text-[15px] font-bold uppercase tracking-[0.18em] text-accent-ink">
            Jobab · #{order.id.slice(-6).toUpperCase()}
          </div>
          <StatusChip status={order.status} payment={order.paymentStatus} />
        </div>
        <div className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
          {created.toLocaleDateString()} · {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
            {order.conversation?.customerName ? ` · conversation ${order.conversation.customerName}` : ''}
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2 px-5 py-3">
        <div className="flex items-center gap-2 text-[12.5px] text-ink-2">
          {order.paymentLink ? (
            <a className="text-accent-ink hover:underline" href={order.paymentLink} target="_blank" rel="noreferrer">
              Payment link
            </a>
          ) : (
            <span className="text-ink-3">No payment link yet</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
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
            onClick={() => window.print()}
            className="rounded-lg border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
          >
            Print
          </button>
          {order.conversation && (
            <Link
              href={`/inbox?c=${order.conversation.id}`}
              className="rounded-lg border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-3"
            >
              Open chat
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function StatusChip({
  status,
  payment,
}: {
  status: OrderStatus;
  payment: 'pending' | 'paid' | 'failed';
}) {
  if (status === 'delivered') return <Chip tone="paid">Delivered</Chip>;
  if (status === 'shipped') return <Chip tone="accent">Shipped</Chip>;
  if (status === 'cancelled') return <Chip tone="red">Cancelled</Chip>;
  if (payment === 'paid' && status === 'confirmed') return <Chip tone="paid">Paid · ready to ship</Chip>;
  if (payment === 'paid') return <Chip tone="paid">Paid</Chip>;
  if (status === 'confirmed') return <Chip tone="accent">Confirmed</Chip>;
  return <Chip tone="amber">Awaiting payment</Chip>;
}

function NextStatusButton({
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
  // For shipped/delivered, offer to notify the customer via the AI.
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
    <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em]', styles[tone])}>
      {children}
    </span>
  );
}
