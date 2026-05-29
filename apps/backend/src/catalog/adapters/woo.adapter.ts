import { CatalogAdapter, CatalogProduct } from '../catalog-adapter';

interface WooCreds {
  siteUrl: string; // e.g. "https://rongdhonu.com"
  consumerKey: string;
  consumerSecret: string;
}

interface WooProduct {
  id: number;
  name: string;
  description?: string;
  short_description?: string;
  price: string;
  regular_price?: string;
  images?: Array<{ src: string }>;
  variations?: number[];
  stock_quantity?: number | null;
  sku?: string;
}

interface WooVariation {
  id: number;
  attributes?: Array<{ name: string; option: string }>;
  sku?: string;
  price: string;
  stock_quantity?: number | null;
}

/**
 * WooCommerce REST API — paginates /products and pulls variations.
 * Auth via consumer key/secret as basic auth (recommended over query params).
 */
export class WooAdapter implements CatalogAdapter {
  readonly source = 'woocommerce' as const;

  async *fetchAll(credentials: unknown): AsyncIterable<CatalogProduct[]> {
    const { siteUrl, consumerKey, consumerSecret } = credentials as WooCreds;
    const base = `${siteUrl.replace(/\/$/, '')}/wp-json/wc/v3`;
    const auth = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    let page = 1;
    while (true) {
      const res = await fetch(`${base}/products?per_page=50&page=${page}`, {
        headers: { authorization: auth, accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Woo ${res.status}: ${await res.text()}`);
      const products = (await res.json()) as WooProduct[];
      if (products.length === 0) break;

      const out: CatalogProduct[] = [];
      for (const p of products) {
        const productOut: CatalogProduct = {
          externalId: String(p.id),
          title: p.name,
          description: stripHtml(p.description || p.short_description || ''),
          price: Number(p.price || p.regular_price || 0),
          currency: 'BDT',
          imageUrl: p.images?.[0]?.src,
          variants: [],
        };

        if (p.variations && p.variations.length > 0) {
          const vRes = await fetch(`${base}/products/${p.id}/variations?per_page=100`, {
            headers: { authorization: auth, accept: 'application/json' },
          });
          if (vRes.ok) {
            const vars = (await vRes.json()) as WooVariation[];
            productOut.variants = vars.map((v) => ({
              externalId: String(v.id),
              name: v.attributes?.map((a) => a.option).join(' · ') || `variant-${v.id}`,
              sku: v.sku ?? undefined,
              price: Number(v.price || productOut.price),
              stockQty: Math.max(0, v.stock_quantity ?? 0),
            }));
          }
        }

        if (productOut.variants.length === 0) {
          // Simple product → synthesize a single default variant so the
          // ordering pipeline (which is variant-centric) still works.
          productOut.variants.push({
            externalId: String(p.id),
            name: 'default',
            sku: p.sku ?? undefined,
            price: productOut.price,
            stockQty: Math.max(0, p.stock_quantity ?? 0),
          });
        }
        out.push(productOut);
      }
      yield out;
      page++;
    }
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
