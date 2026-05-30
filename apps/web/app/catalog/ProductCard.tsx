'use client';

import { cn } from '@/lib/cn';
import type { Product } from '@/lib/types';
import { Caret } from './icons';
import { VariantRow } from './VariantRow';

/** One product tile in the catalog grid. Stateless. */
export function ProductCard({
  product,
  onVariantStockChange,
}: {
  product: Product;
  onVariantStockChange: (variantId: string, qty: number) => void | Promise<void>;
}) {
  const inStock = product.variants.some((v) => v.stockQty > 0);
  return (
    <article className="rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="aspect-[4/3] w-full rounded-t-2xl"
        style={{
          background:
            'repeating-linear-gradient(45deg, var(--surface-2) 0 12px, var(--surface-3) 12px 24px)',
        }}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-[16px] font-semibold tracking-display">
              {product.title}
            </div>
            {product.description && (
              <div className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-2">
                {product.description}
              </div>
            )}
          </div>
          <div
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em]',
              inStock ? 'bg-paid-bg text-paid' : 'bg-amber-bg text-amber',
            )}
          >
            {inStock ? 'In stock' : 'OOS'}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-ink-3">
              From
            </div>
            <div className="font-display text-[22px] font-bold tabular-nums tracking-display">
              ৳{Number(product.price).toLocaleString()}
            </div>
          </div>
          <div className="text-right text-[11.5px] text-ink-3">
            {product.variants.length} variant{product.variants.length === 1 ? '' : 's'}
            <br />
            <span className="text-ink-2">
              {product.variants.reduce((a, v) => a + v.stockQty, 0)} in stock
            </span>
          </div>
        </div>

        <details className="group rounded-xl border border-border-2 bg-surface-2 open:bg-surface-2/60">
          <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-[12.5px] font-semibold text-ink-2 transition group-open:text-ink">
            <span>Manage stock</span>
            <Caret />
          </summary>
          <div className="space-y-1.5 px-2 pb-2">
            {product.variants.map((v) => (
              <VariantRow key={v.id} variant={v} onChange={onVariantStockChange} />
            ))}
          </div>
        </details>
      </div>
    </article>
  );
}
