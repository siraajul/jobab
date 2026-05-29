'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Product, ProductVariant } from '@/lib/types';

export function CatalogClient({ initial }: { initial: Product[] }) {
  const toast = useToast();
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const csv = await file.text();
      const res = await api.syncCsv(csv);
      toast('success', `Synced ${res.products} products / ${res.variants} variants.`);
      setProducts(await api.listProducts());
    } catch (e) {
      toast('error', "CSV import failed — check the format and try again.");
    } finally {
      setUploading(false);
    }
  };

  /* Inline stock edit — used by the variant editor on each card. Optimistic
     update first so the UI feels instant; we revert and toast on failure. */
  const onVariantStockChange = async (variantId: string, qty: number) => {
    const prev = products;
    setProducts((current) =>
      current.map((p) => ({
        ...p,
        variants: p.variants.map((v) =>
          v.id === variantId ? { ...v, stockQty: qty } : v,
        ),
      })),
    );
    try {
      await api.setVariantStock(variantId, qty);
      toast('success', qty === 0 ? 'Marked out of stock.' : `Stock set to ${qty}.`);
    } catch {
      setProducts(prev);
      toast('error', "Couldn't update stock — try again.");
    }
  };

  return (
    <AppShell
      title="Catalog"
      subtitle={`${products.length} product${products.length === 1 ? '' : 's'} · synced with AI`}
      actions={
        <label className="cursor-pointer rounded-full bg-accent px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-sm transition hover:brightness-110">
          {uploading ? 'Uploading…' : 'Import CSV'}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
              e.target.value = '';
            }}
          />
        </label>
      }
    >
      <div className="mb-5 flex items-center gap-2 rounded-[12px] border border-border-2 bg-surface-2 px-3 py-2.5 text-ink-3">
        <SearchIcon />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products…"
          className="flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No matches' : 'Empty catalog'}
          body={
            query
              ? `Nothing matches "${query}".`
              : 'Upload a CSV (external_id, title, price, variant_name, stock_qty…) or connect Shopify / WooCommerce from Settings.'
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onVariantStockChange={onVariantStockChange}
            />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center gap-2">
          <JamdaniMark size={14} className="text-accent" />
          <div className="font-display text-[14px] font-bold uppercase tracking-[0.18em] text-accent-ink">
            CSV format
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl bg-surface-2 p-3 font-mono text-[11.5px] text-ink-2">
          <code>
            external_id,title,description,price,currency,image_url,variant_external_id,variant_name,sku,variant_price,stock_qty
          </code>
        </div>
        <p className="mt-2 text-[12.5px] text-ink-2">
          One row per variant. Products are grouped by <code className="font-mono text-[11.5px] text-ink">external_id</code>.
        </p>
      </div>
    </AppShell>
  );
}

function ProductCard({
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

function VariantRow({
  variant,
  onChange,
}: {
  variant: ProductVariant;
  onChange: (id: string, qty: number) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState<string>(String(variant.stockQty));
  const [saving, setSaving] = useState(false);

  const dirty = draft.trim() !== String(variant.stockQty);

  const commit = async (qty: number) => {
    if (qty === variant.stockQty) return;
    setSaving(true);
    try {
      await onChange(variant.id, qty);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const parsed = Math.max(0, Math.floor(Number(draft)));
    if (!Number.isFinite(parsed)) return;
    setDraft(String(parsed));
    await commit(parsed);
  };

  return (
    <div className="flex items-center gap-2 rounded-lg bg-surface px-2.5 py-2">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">{variant.name}</div>
        <div className="truncate text-[11px] text-ink-3">
          {variant.sku ?? '—'} · ৳{Number(variant.price).toLocaleString()}
        </div>
      </div>
      <button
        type="button"
        onClick={() => commit(0)}
        disabled={saving || variant.stockQty === 0}
        title="Mark out of stock"
        className="shrink-0 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-[11px] font-semibold text-amber transition hover:bg-amber-bg disabled:opacity-40"
      >
        OOS
      </button>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            void handleSave();
          }
        }}
        className="w-16 shrink-0 rounded-md border border-border-2 bg-surface-2 px-2 py-1 text-right text-[13px] tabular-nums outline-none focus:border-accent"
      />
      <button
        type="button"
        onClick={handleSave}
        disabled={!dirty || saving}
        className="shrink-0 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
      >
        {saving ? '…' : 'Save'}
      </button>
    </div>
  );
}

function Caret() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="transition group-open:rotate-180"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
