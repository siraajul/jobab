import { cn } from '@/lib/cn';
import type { ConversationDetail, Order } from '@/lib/types';
import { productCatalog } from '@/lib/fixtures';
import { JamdaniBand, JamdaniMark, PerforatedEdge } from '@/components/shared/Jamdani';

const STEPS = ['collecting', 'ready', 'created', 'paid'] as const;

export function OrderPanel({
  conversation,
  order,
}: {
  conversation: ConversationDetail;
  order: Order | null;
}) {
  if (!order) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
        <JamdaniMark size={28} className="text-ink-3" />
        <div className="font-display text-base font-semibold tracking-display text-ink">
          Listening.
        </div>
        <div className="max-w-[16rem] text-[13.5px] text-ink-2">
          The receipt appears here once the AI begins assembling an order with this customer.
        </div>
        <div className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-ink-3">
          <span className="h-1.5 w-1.5 animate-jb-pulse rounded-full bg-accent" />
          AI handling
        </div>
      </div>
    );
  }

  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = items.reduce((acc, it) => acc + it.price * it.qty, 0);
  const total = Number(order.total) || subtotal;
  const delivery = total - subtotal;

  const missing = {
    name: !conversation.customerName?.trim(),
    phone: !conversation.customerPhone?.trim(),
    address: !conversation.customerAddress?.trim(),
  };
  const anyMissing = missing.name || missing.phone || missing.address;
  const orderNo = order.id.slice(-4).toUpperCase();

  return (
    <div className="relative flex h-full flex-col px-5 py-6 animate-jb-slidein">
      {/* Receipt body — paper card with perforated edges. */}
      <div className="relative flex flex-1 flex-col overflow-hidden rounded-[18px] bg-surface shadow-md">
        <PerforatedEdge direction="top" fill="var(--bg)" />

        {/* Header */}
        <div className="px-5 pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-display text-[15px] font-bold uppercase tracking-[0.18em] text-accent-ink">
              <JamdaniMark size={13} className="text-accent" />
              Jobab
              <span className="text-ink-3">·</span>
              <span className="tabular-nums text-ink-2">#{orderNo}</span>
            </div>
            <Stamp status={order.status === 'created' ? 'created' : 'collecting'} />
          </div>
          <div className="mt-1 text-[11.5px] uppercase tracking-wider text-ink-3">
            Live order receipt
          </div>
          <Stepper status={order.status === 'created' ? 'created' : 'collecting'} />
        </div>

        <div className="mx-5">
          <JamdaniBand className="h-2.5 text-accent" />
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 pt-4">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
            Items
          </div>
          <ul className="mt-2 divide-y divide-dashed divide-border">
            {items.map((it, idx) => {
              const meta = productCatalog[it.product_id] ?? {
                title: it.product_id,
                variant: '',
              };
              return (
                <li key={idx} className="flex gap-3 py-3">
                  <div
                    className="h-14 w-12 shrink-0 rounded-md"
                    style={{
                      background:
                        'repeating-linear-gradient(45deg, var(--surface-2) 0 9px, var(--surface-3) 9px 18px)',
                    }}
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="text-[14.5px] font-semibold leading-tight">{meta.title}</div>
                    <div className="text-[12.5px] text-ink-2">{meta.variant}</div>
                    <div className="mt-1 text-[11.5px] text-ink-3">
                      {it.qty} × ৳{it.price.toLocaleString()}
                    </div>
                  </div>
                  <div className="font-display text-[15px] font-semibold tabular-nums">
                    ৳{(it.price * it.qty).toLocaleString()}
                  </div>
                </li>
              );
            })}
          </ul>

          {delivery > 0 && (
            <div className="flex justify-between border-t border-dashed border-border py-2.5 text-[13px] tabular-nums">
              <span className="text-ink-2">Delivery</span>
              <span>৳{delivery.toLocaleString()}</span>
            </div>
          )}

          {/* Hero total */}
          <div className="mt-4 border-t-2 border-double border-border pt-3">
            <div className="flex items-end justify-between">
              <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-ink-3">
                Total
              </div>
              <div className="font-display text-[34px] font-bold leading-none tabular-nums tracking-display text-ink">
                ৳{total.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Customer block — receipt-style key/value rows */}
          <div className="mt-5">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
              Ship to
            </div>
            <dl className="mt-2 grid grid-cols-[64px_1fr] gap-y-1.5 text-[13.5px]">
              <ReceiptRow label="Name" value={conversation.customerName} missing={missing.name} />
              <ReceiptRow label="Phone" value={conversation.customerPhone} missing={missing.phone} />
              <ReceiptRow
                label="Address"
                value={conversation.customerAddress}
                missing={missing.address}
              />
            </dl>
          </div>
        </div>

        {/* Footer band + CTA */}
        <div className="mt-4">
          {anyMissing && (
            <div className="mx-5 mb-3 flex items-center gap-2 rounded-md border border-dashed border-amber bg-amber-bg px-3 py-2 text-[12.5px] font-semibold uppercase tracking-wider text-amber">
              <span className="h-1.5 w-1.5 rounded-full bg-amber" />
              Address missing — order on hold
            </div>
          )}
          <div className="mx-5 mb-3">
            <button
              type="button"
              disabled={anyMissing}
              className={cn(
                'w-full rounded-xl px-4 py-3 font-display text-[15px] font-semibold tracking-tight transition',
                anyMissing
                  ? 'cursor-not-allowed bg-surface-2 text-ink-3'
                  : 'bg-accent text-white shadow-md hover:brightness-105',
              )}
            >
              {anyMissing ? 'Waiting on address' : 'Confirm & send payment link'}
            </button>
          </div>
          <div className="mx-5 mb-2 flex items-center justify-between text-[10.5px] uppercase tracking-[0.22em] text-ink-3">
            <span>BDT · Dhaka</span>
            <span>Auto-assembled by AI</span>
          </div>
          <PerforatedEdge direction="bottom" fill="var(--bg)" />
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({
  label,
  value,
  missing,
}: {
  label: string;
  value: string | null;
  missing: boolean;
}) {
  return (
    <>
      <dt className="text-[10.5px] font-bold uppercase tracking-wider text-ink-3">{label}</dt>
      <dd
        className={cn(
          'text-[13.5px]',
          missing ? 'font-semibold text-amber' : 'text-ink',
        )}
      >
        {value?.trim() ? value : `— missing ${label.toLowerCase()}`}
      </dd>
    </>
  );
}

function Stamp({ status }: { status: 'collecting' | 'ready' | 'created' | 'paid' }) {
  const label = status.toUpperCase();
  const tone =
    status === 'paid'
      ? 'text-paid border-paid'
      : status === 'created'
        ? 'text-accent-ink border-accent'
        : 'text-amber border-amber';
  return (
    <div
      className={cn(
        'rounded-[6px] border-2 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.22em] -rotate-[4deg]',
        tone,
      )}
    >
      {label}
    </div>
  );
}

function Stepper({ status }: { status: 'collecting' | 'ready' | 'created' | 'paid' }) {
  const i = STEPS.indexOf(status);
  return (
    <div className="mt-3 flex items-center gap-1.5">
      {STEPS.map((s, idx) => {
        const done = idx < i;
        const cur = idx === i;
        return (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                done && 'bg-accent',
                cur && 'bg-accent ring-4 ring-accent-soft',
                !done && !cur && 'bg-border-2',
              )}
            />
            <span
              className={cn(
                'text-[10.5px] font-semibold uppercase tracking-wider',
                done && 'text-accent-ink',
                cur && 'text-accent',
                !done && !cur && 'text-ink-3',
              )}
            >
              {s}
            </span>
            {idx < STEPS.length - 1 && (
              <span className={cn('h-px w-4', done ? 'bg-accent' : 'bg-border-2')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
