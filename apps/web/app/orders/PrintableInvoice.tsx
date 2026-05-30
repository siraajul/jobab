'use client';

import type { OrderListItem } from '@/lib/types';
import { productCatalog } from '@/lib/fixtures';
import type { ShopInfo } from './useOrdersState';

/**
 * Print-only invoice. Rendered as a hidden block on screen and revealed by
 * `@media print` (see `.invoice-print` in globals.css). Uses inline styles
 * so the print stylesheet is self-contained and predictable across browsers.
 */
export function PrintableInvoice({ order, shop }: { order: OrderListItem; shop: ShopInfo }) {
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
              {created.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
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
            <div className="invoice-customer-line invoice-address">
              {order.customerAddress || '—'}
            </div>
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
                  <td style={{ textAlign: 'right' }}>
                    ৳ {(Number(it.price) * Number(it.qty)).toLocaleString()}
                  </td>
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
                <div className="invoice-thanks-sub">Questions? WhatsApp or call {shop.phone}</div>
              )}
            </div>
          </div>
          <div className="invoice-fineprint">
            Generated{' '}
            {new Date().toLocaleString(undefined, {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            · Powered by Jobab AI
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
          <path d="M10 1.5 L18 7 L10 12.5 L2 7 Z" fill="none" stroke="#1F6E47" strokeWidth="0.8" />
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
