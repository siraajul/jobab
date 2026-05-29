/**
 * Catalog adapter (spec §8). Each integration (Shopify / WooCommerce / CSV)
 * implements this; the sync job is source-agnostic.
 */
export interface CatalogProduct {
  externalId: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  variants: CatalogVariant[];
}

export interface CatalogVariant {
  externalId: string;
  name: string;
  sku?: string;
  price: number;
  stockQty: number;
}

export interface CatalogAdapter {
  readonly source: 'shopify' | 'woocommerce' | 'csv';
  /** Yield products in batches; the sync job upserts and embeds. */
  fetchAll(credentials: unknown): AsyncIterable<CatalogProduct[]>;
}
