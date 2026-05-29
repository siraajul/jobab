'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Product } from '@/lib/types';

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
            <ProductCard key={p.id} product={p} />
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

function ProductCard({ product }: { product: Product }) {
  const inStock = product.variants.some((v) => v.stockQty > 0);
  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div
        className="aspect-[4/3] w-full"
        style={{
          background:
            'repeating-linear-gradient(45deg, var(--surface-2) 0 12px, var(--surface-3) 12px 24px)',
        }}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-[16px] font-semibold tracking-display">
              {product.title}
            </div>
            {product.description && (
              <div className="line-clamp-2 mt-0.5 text-[12.5px] text-ink-2">
                {product.description}
              </div>
            )}
          </div>
          <div
            className={cn(
              'rounded-full px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-[0.14em]',
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
      </div>
    </article>
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
