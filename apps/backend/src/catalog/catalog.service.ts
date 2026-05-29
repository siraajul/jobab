import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CatalogSearchResult {
  product_id: string;
  title: string;
  price: number;
  currency: string;
  variants: Array<{ variant_id: string; name: string; in_stock: boolean }>;
  /** Cosine similarity in [0..1] when results come from vector search. */
  similarity?: number;
  /** First product image URL (for the candidate-match cards). */
  image_url?: string | null;
  /** Catalog description, surfaced for confirmMatch prompts. */
  description?: string | null;
}

export interface VisualSearchResult extends CatalogSearchResult {
  similarity: number;
  image_url: string | null;
  description: string | null;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Visual K-nearest-neighbor search via pgvector cosine similarity.
   * `<=>` is pgvector's cosine distance operator (0 = identical).
   * We convert distance to similarity = 1 - distance in [0..2] → clamp to [0..1].
   */
  async searchByImageEmbedding(
    organizationId: string,
    embedding: number[],
    k: number,
  ): Promise<VisualSearchResult[]> {
    if (embedding.length === 0) return [];
    const vec = `[${embedding.join(',')}]`;
    // Raw query — Prisma can't express pgvector ops via the schema.
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        description: string | null;
        price: string | number;
        currency: string;
        image_url: string | null;
        distance: string | number;
      }>
    >(
      `SELECT p.id, p.title, p.description, p.price, p.currency, p.image_url,
              (p.image_embedding <=> $1::vector) AS distance
         FROM products p
         WHERE p.organization_id = $2
           AND p.image_embedding IS NOT NULL
         ORDER BY p.image_embedding <=> $1::vector
         LIMIT $3`,
      vec,
      organizationId,
      k,
    );

    if (rows.length === 0) return [];

    const ids = rows.map((r) => r.id);
    const variants = await this.prisma.productVariant.findMany({
      where: { productId: { in: ids } },
    });
    const byProduct = new Map<string, typeof variants>();
    for (const v of variants) {
      const list = byProduct.get(v.productId) ?? [];
      list.push(v);
      byProduct.set(v.productId, list);
    }

    return rows.map((r) => {
      const dist = Number(r.distance);
      const similarity = Math.max(0, Math.min(1, 1 - dist / 2));
      const vs = byProduct.get(r.id) ?? [];
      return {
        product_id: r.id,
        title: r.title,
        price: Number(r.price),
        currency: r.currency,
        similarity,
        image_url: r.image_url,
        description: r.description,
        variants: vs.map((v) => ({
          variant_id: v.id,
          name: v.name,
          in_stock: v.stockQty > 0,
        })),
      };
    });
  }

  /**
   * Phase 1: token-OR'd ILIKE search across title/description/variant names.
   * Customers query in Bangla/Banglish/English with words the title may not
   * contain verbatim ("medium size", "festive", "red"), so we match any of
   * the tokens and rank by how many hit.
   *
   * Phase 2: swap for pgvector cosine similarity over `text_embedding`
   *          (and `image_embedding` for §9).
   */
  async search(
    organizationId: string,
    query: string,
    limit: number,
  ): Promise<CatalogSearchResult[]> {
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: {
        organizationId,
        OR: tokens.flatMap((t) => [
          { title: { contains: t, mode: 'insensitive' as const } },
          { description: { contains: t, mode: 'insensitive' as const } },
          { variants: { some: { name: { contains: t, mode: 'insensitive' as const } } } },
        ]),
      },
      include: { variants: true },
      take: limit * 3, // overfetch — we rank then trim
    });

    const scored = products.map((p) => {
      const hay = `${p.title} ${p.description ?? ''} ${p.variants.map((v) => v.name).join(' ')}`.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { p, score };
    });
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ p }) => ({
      product_id: p.id,
      title: p.title,
      price: Number(p.price),
      currency: p.currency,
      variants: p.variants.map((v) => ({
        variant_id: v.id,
        name: v.name,
        in_stock: v.stockQty > 0,
      })),
    }));
  }
}

/**
 * Lowercase, drop short/noise words, keep meaningful tokens. Handles Bangla
 * (Unicode category L) the same as Latin — \p{L} keeps both.
 */
const STOPWORDS = new Set([
  'a', 'the', 'is', 'are', 'i', 'me', 'my', 'we', 'you', 'and', 'or',
  'ki', 'ta', 'ami', 'apnar', 'apnake', 'tomar', 'amar', 'koto', 'ache', 'achi',
  'size', 'please', 'ektu',
]);
function tokenize(q: string): string[] {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = words.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(out));
}
