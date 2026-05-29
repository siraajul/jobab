'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { usePoll } from '@/lib/use-poll';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { OrderListItem } from '@/lib/types';
import { productCatalog } from '@/lib/fixtures';

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

interface ShopInfo {
  name: string;
  phone: string | null;
}

export function OrdersClient({ initial }: { initial: OrderListItem[] }) {
  const toast = useToast();
  const [orders, setOrders] = useState(initial);
  const [filter, setFilter] = useState<Filter>('all');
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopInfo>({ name: 'Your Shop', phone: null });

  /* Pull the merchant's shop info once so the invoice header is personalised
     when the user hits Print. Failures are silent — the invoice falls back
     to the default name. */
  useEffect(() => {
    api
      .getSettings()
      .then((s) => setShop({ name: s.name, phone: s.notificationPhone ?? null }))
      .catch(() => undefined);
  }, []);

  /* Two-phase print: set the target id so React renders the printable
     invoice for that order, then fire window.print() on the next frame.
     We also retitle the document while printing so that — if the user has
     re-enabled the browser's print headers — those headers show a clean
     "Invoice #XYZ" label instead of "Jobab — AI Sales Agent". */
  useEffect(() => {
    if (!printingId) return;
    const previousTitle = document.title;
    const orderNo = printingId.slice(-6).toUpperCase();
    document.title = `Invoice ${orderNo}`;
    const clear = () => {
      document.title = previousTitle;
      setPrintingId(null);
    };
    window.addEventListener('afterprint', clear, { once: true });
    const raf = requestAnimationFrame(() => window.print());
    return () => {
      window.removeEventListener('afterprint', clear);
      cancelAnimationFrame(raf);
      document.title = previousTitle;
    };
  }, [printingId]);

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
      <div className="mb-5 flex flex-wrap gap-1.5 print:hidden">
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
              onPrint={() => setPrintingId(o.id)}
              onMarkPaid={markPaid}
              onSetStatus={setStatus}
            />
          ))}
        </div>
      )}

      {/* The printable invoice lives outside the visible cards. It renders only
          for the order being printed and is hidden on screen via globals.css
          (`.invoice-print` is display:none by default and block in @media print).
          Keeping it as a single instance per print avoids N hidden DOM copies. */}
      {printingId &&
        (() => {
          const order = orders.find((o) => o.id === printingId);
          if (!order) return null;
          return <PrintableInvoice order={order} shop={shop} />;
        })()}
    </AppShell>
  );
}

function OrderCard({
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

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-b-2xl border-t border-border bg-surface-2 px-5 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[12.5px] text-ink-2">
          {order.paymentLink ? (
            <a className="truncate text-accent-ink hover:underline" href={order.paymentLink} target="_blank" rel="noreferrer">
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

/**
 * Print-only invoice. Rendered as a hidden block on screen and revealed by
 * `@media print` (see `.invoice-print` in globals.css). Uses inline styles
 * so the print stylesheet is self-contained and predictable across browsers.
 */
function PrintableInvoice({
  order,
  shop,
}: {
  order: OrderListItem;
  shop: { name: string; phone: string | null };
}) {
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((acc, i) => acc + Number(i.price) * Number(i.qty), 0);
  const total = Number(order.total) || subtotal;
  const delivery = Math.max(0, total - subtotal);
  const created = new Date(order.createdAt);
  const orderNo = order.id.slice(-6).toUpperCase();
  const paymentLabel =
    order.paymentStatus === 'paid'
      ? 'PAID'
      : order.paymentStatus === 'failed'
        ? 'PAYMENT FAILED'
        : 'PAYMENT PENDING';

  return (
    <div className="invoice-print">
      {/* Faint order-no watermark behind the content. */}
      <div className="invoice-watermark" aria-hidden>
        #{orderNo}
      </div>

      <div className="invoice-page">
        <InvoiceBand position="top" />

        <header className="invoice-head">
          <div className="invoice-brand">
            <InvoiceJamdaniMark />
            <div>
              <div className="invoice-shop">{shop.name}</div>
              <div className="invoice-sub">Order Receipt · Tax Invoice</div>
            </div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-no-label">Invoice No.</div>
            <div className="invoice-no">#{orderNo}</div>
            <div className="invoice-date">
              {created.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              <br />
              {created.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </header>

        <section className="invoice-grid">
          <div className="invoice-card">
            <div className="invoice-label">Bill To</div>
            <div className="invoice-name">{order.customerName || '—'}</div>
            <div className="invoice-customer-line">{order.customerPhone || '—'}</div>
            <div className="invoice-customer-line invoice-address">{order.customerAddress || '—'}</div>
          </div>
          <div className="invoice-card">
            <div className="invoice-label">Order Status</div>
            <div className="invoice-status">{order.status.toUpperCase()}</div>
            <div
              className={
                'invoice-payment ' +
                (order.paymentStatus === 'paid'
                  ? 'invoice-payment-paid'
                  : order.paymentStatus === 'failed'
                    ? 'invoice-payment-failed'
                    : 'invoice-payment-pending')
              }
            >
              <span className="invoice-payment-dot" /> {paymentLabel}
            </div>
          </div>
        </section>

        <div className="invoice-section-title">Items</div>
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ width: '46%' }}>Description</th>
              <th>Variant</th>
              <th style={{ textAlign: 'center', width: '8%' }}>Qty</th>
              <th style={{ textAlign: 'right', width: '15%' }}>Unit</th>
              <th style={{ textAlign: 'right', width: '15%' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const meta = productCatalog[it.product_id] ?? { title: it.product_id, variant: '' };
              return (
                <tr key={idx}>
                  <td className="invoice-item-title">{meta.title}</td>
                  <td className="invoice-item-variant">{meta.variant || '—'}</td>
                  <td style={{ textAlign: 'center' }}>{it.qty}</td>
                  <td style={{ textAlign: 'right' }}>৳ {Number(it.price).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>৳ {(Number(it.price) * Number(it.qty)).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <section className="invoice-totals-wrap">
          <div className="invoice-totals">
            <div className="invoice-totals-row">
              <span>Subtotal</span>
              <span>৳ {subtotal.toLocaleString()}</span>
            </div>
            {delivery > 0 && (
              <div className="invoice-totals-row">
                <span>Delivery</span>
                <span>৳ {delivery.toLocaleString()}</span>
              </div>
            )}
            <div className="invoice-totals-grand">
              <span>Total Due</span>
              <span className="invoice-totals-grand-amount">৳ {total.toLocaleString()}</span>
            </div>
          </div>
        </section>

        {order.paymentLink && order.paymentStatus !== 'paid' && (
          <section className="invoice-pay-link">
            <div className="invoice-pay-head">
              <div className="invoice-label">Pay Online</div>
              <div className="invoice-pay-instructions">
                Open the link in any browser to complete payment via bKash.
              </div>
            </div>
            <div className="invoice-pay-url">{order.paymentLink}</div>
          </section>
        )}

        <footer className="invoice-footer">
          <div className="invoice-thanks">
            <InvoiceJamdaniMark small />
            <div>
              <div className="invoice-thanks-line">Thank you for shopping with {shop.name}.</div>
              {shop.phone && (
                <div className="invoice-thanks-sub">
                  Questions? WhatsApp or call {shop.phone}
                </div>
              )}
            </div>
          </div>
          <div className="invoice-fineprint">
            Generated {new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · Powered by Jobab AI
          </div>
        </footer>

        <InvoiceBand position="bottom" />
      </div>
    </div>
  );
}

/** Inline Jamdani lattice band — emerald, with explicit fills so it survives
 *  the browser's print colour-stripping for SVG pattern fills. */
function InvoiceBand({ position }: { position: 'top' | 'bottom' }) {
  return (
    <svg
      className={`invoice-band invoice-band-${position}`}
      viewBox="0 0 600 14"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="invoice-jb" width="20" height="14" patternUnits="userSpaceOnUse">
          <path
            d="M10 1.5 L18 7 L10 12.5 L2 7 Z"
            fill="none"
            stroke="#1F6E47"
            strokeWidth="0.8"
          />
          <circle cx="10" cy="7" r="0.85" fill="#1F6E47" />
        </pattern>
      </defs>
      <rect width="600" height="14" fill="url(#invoice-jb)" />
    </svg>
  );
}

function InvoiceJamdaniMark({ small = false }: { small?: boolean }) {
  const s = small ? 16 : 22;
  return (
    <svg
      className="invoice-mark"
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="#1F6E47"
      aria-hidden
    >
      <path d="M12 1.5l3 5.5 5.5 1.5-4 4 1 6L12 16l-5.5 2.5 1-6-4-4L9 7z" opacity=".18" />
      <path d="M12 5l1.6 3 3.4.5-2.5 2.4.6 3.4L12 12.6l-3.1 1.7.6-3.4-2.5-2.4 3.4-.5z" />
      <circle cx="12" cy="9.8" r="0.9" fill="#fff" />
    </svg>
  );
}
