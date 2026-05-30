'use client';

import { useMemo, useState } from 'react';
import { useToast } from '@/components/shared/Toast';
import { api } from '@/lib/api';
import type { Product } from '@/lib/types';

/**
 * State + mutations for the Catalog page.
 *
 * `CatalogClient` (the orchestrator) owns layout only; `ProductCard` and
 * `VariantRow` are stateless. Everything stateful lives here.
 */
export function useCatalogState(initial: Product[]) {
  const toast = useToast();
  const [products, setProducts] = useState(initial);
  const [query, setQuery] = useState('');
  const [uploading, setUploading] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    );
  }, [products, query]);

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const csv = await file.text();
      const res = await api.syncCsv(csv);
      toast('success', `Synced ${res.products} products / ${res.variants} variants.`);
      setProducts(await api.listProducts());
    } catch {
      toast('error', 'CSV import failed — check the format and try again.');
    } finally {
      setUploading(false);
    }
  };

  /**
   * Inline stock edit, optimistic: snapshot → mutate UI → call API → revert
   * if the API failed. Used by the variant editor on each card.
   */
  const onVariantStockChange = async (variantId: string, qty: number) => {
    const prev = products;
    setProducts((current) =>
      current.map((p) => ({
        ...p,
        variants: p.variants.map((v) => (v.id === variantId ? { ...v, stockQty: qty } : v)),
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

  return {
    products,
    filtered,
    query,
    setQuery,
    uploading,
    onUpload,
    onVariantStockChange,
  };
}
