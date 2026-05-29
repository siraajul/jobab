import { CatalogAdapter, CatalogProduct } from '../catalog-adapter';

interface ShopifyCreds {
  shop: string; // e.g. "rongdhonu-boutique.myshopify.com"
  accessToken: string;
  apiVersion?: string;
}

interface ShopifyProductNode {
  id: string;
  title: string;
  descriptionHtml?: string | null;
  featuredImage?: { url: string } | null;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        sku?: string | null;
        price: string;
        inventoryQuantity?: number | null;
      };
    }>;
  };
}

/**
 * Shopify Admin GraphQL — paginates products with their variants.
 * Token comes from the merchant's connected app (the spec defers OAuth
 * collection to onboarding §16; this adapter is given the final token).
 */
export class ShopifyAdapter implements CatalogAdapter {
  readonly source = 'shopify' as const;

  async *fetchAll(credentials: unknown): AsyncIterable<CatalogProduct[]> {
    const { shop, accessToken, apiVersion = '2024-07' } = credentials as ShopifyCreds;
    const url = `https://${shop}/admin/api/${apiVersion}/graphql.json`;
    const headers = {
      'content-type': 'application/json',
      'x-shopify-access-token': accessToken,
    };

    let cursor: string | null = null;
    while (true) {
      const query = /* GraphQL */ `
        query($cursor: String) {
          products(first: 50, after: $cursor) {
            pageInfo { hasNextPage endCursor }
            edges {
              node {
                id
                title
                descriptionHtml
                featuredImage { url }
                variants(first: 50) {
                  edges {
                    node { id title sku price inventoryQuantity }
                  }
                }
              }
            }
          }
        }
      `;
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query, variables: { cursor } }),
      });
      if (!res.ok) throw new Error(`Shopify ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as {
        data?: { products?: { pageInfo: { hasNextPage: boolean; endCursor: string }; edges: Array<{ node: ShopifyProductNode }> } };
        errors?: Array<{ message: string }>;
      };
      if (json.errors?.length) throw new Error(`Shopify: ${json.errors.map((e) => e.message).join('; ')}`);
      const products = json.data?.products;
      if (!products) break;

      yield products.edges.map(({ node }) => ({
        externalId: node.id,
        title: node.title,
        description: stripHtml(node.descriptionHtml ?? '') || undefined,
        price: Number(node.variants.edges[0]?.node.price ?? 0),
        currency: 'BDT', // Shopify currency is per-store; pull from shop settings if needed
        imageUrl: node.featuredImage?.url,
        variants: node.variants.edges.map(({ node: v }) => ({
          externalId: v.id,
          name: v.title,
          sku: v.sku ?? undefined,
          price: Number(v.price),
          stockQty: Math.max(0, v.inventoryQuantity ?? 0),
        })),
      }));

      if (!products.pageInfo.hasNextPage) break;
      cursor = products.pageInfo.endCursor;
    }
  }
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
