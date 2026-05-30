'use client';

import { AppShell } from '@/components/layout/AppShell';
import { EmptyState } from '@/components/shared/EmptyState';
import { JamdaniMark } from '@/components/shared/Jamdani';
import type { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { SearchIcon } from './icons';
import { useCatalogState } from './useCatalogState';

/**
 * Catalog-page orchestrator. Layout, search bar, CSV import button, grid of
 * cards. State + mutations live in `useCatalogState`; the card is stateless
 * in `ProductCard`; the inline stock editor in `VariantRow`.
 */
export function CatalogClient({ initial }: { initial: Product[] }) {
  const { products, filtered, query, setQuery, uploading, onUpload, onVariantStockChange } =
    useCatalogState(initial);

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
            <ProductCard key={p.id} product={p} onVariantStockChange={onVariantStockChange} />
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
          One row per variant. Products are grouped by{' '}
          <code className="font-mono text-[11.5px] text-ink">external_id</code>.
        </p>
      </div>
    </AppShell>
  );
}
