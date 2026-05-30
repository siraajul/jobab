'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { cn } from '@/lib/cn';
import type { OrderListItem } from '@/lib/types';
import { OrderCard } from './OrderCard';
import { PrintableInvoice } from './PrintableInvoice';
import { useOrdersState, type Filter } from './useOrdersState';

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'created', label: 'Created' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'paid', label: 'Paid' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
];

/**
 * Orders-page orchestrator. Owns layout + filter chips + print trigger only;
 * data fetching / mutations live in `useOrdersState`, per-row UI in
 * `OrderCard`, status chips in `StatusChip`, and the printable invoice in
 * `PrintableInvoice`.
 */
export function OrdersClient({ initial }: { initial: OrderListItem[] }) {
  const { orders, filter, setFilter, filtered, revenue, shop, setStatus, markPaid } =
    useOrdersState(initial);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Two-phase print: set the target id so React renders the printable invoice
  // for that order, then fire window.print() on the next frame. We retitle the
  // document while printing so the browser's optional print-header label shows
  // a clean "Invoice #XYZ" instead of the app title.
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

  return (
    <AppShell
      title="Orders"
      subtitle={`${orders.length} total · ৳${revenue.toLocaleString()} revenue`}
      actions={
        <Link
          href="/inbox"
          className="rounded-full border border-border-2 bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-2 transition hover:bg-surface-2"
        >
          Back to inbox
        </Link>
      }
    >
      <div className="mb-5 flex flex-wrap gap-1.5 print:hidden">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition',
              filter === f.key ? 'bg-ink text-bg' : 'bg-surface-2 text-ink-2 hover:bg-surface-3',
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
              ? 'Orders will appear here as the AI assembles and confirms them. Try the inbox to see one in progress.'
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
