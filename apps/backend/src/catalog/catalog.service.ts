import { Prisma } from '@prisma/client';
import { JinaEmbeddingProvider } from '../embeddings/jina.provider';
import { Injectable, Optional } from '@nestjs/common';
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
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly embeddings?: JinaEmbeddingProvider,
  ) {}

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
    return this.searchByEmbedding(organizationId, embedding, k, 'image');
  }

  async searchByEmbedding(
    organizationId: string,
    embedding: number[],
    k: number,
    kind: 'text' | 'image',
  ): Promise<VisualSearchResult[]> {
    if (
      embedding.length !== 1024 ||
      !embedding.every(Number.isFinite) ||
      !embedding.some((v) => v !== 0)
    )
      return [];
    const column = Prisma.raw(kind === 'text' ? 'p.text_embedding' : 'p.image_embedding');
    const modelColumn = Prisma.raw(
      kind === 'text' ? 'p.text_embedding_model' : 'p.image_embedding_model',
    );
    const model =
      kind === 'text' ? 'jina-embeddings-v3:retrieval.passage:1024' : 'jina-clip-v2:1024';
    const vec = `[${embedding.join(',')}]`;
    const rows = await this.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string | null;
        price: string | number;
        currency: string;
        image_url: string | null;
        distance: string | number;
      }>
    >(Prisma.sql`
      SELECT p.id, p.title, p.description, p.price, p.currency, p.image_url,
             (${column}::vector(1024) <=> ${vec}::vector(1024)) AS distance
      FROM products p WHERE p.organization_id = ${organizationId}
        AND ${column} IS NOT NULL AND vector_dims(${column}) = 1024 AND ${modelColumn} = ${model}
      ORDER BY ${column}::vector(1024) <=> ${vec}::vector(1024) LIMIT ${Math.max(1, Math.min(k, 50))}
    `);
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
      const similarity = Math.max(0, Math.min(1, 1 - dist));
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
    const take = Math.max(1, Math.min(limit, 50));
    const lexical = await this.keywordSearch(organizationId, query, take);
    if (!this.embeddings?.available) return lexical;
    const vector = await this.embeddings.embedText(query, 'retrieval.query');
    if (!vector) return lexical;
    const semantic = (await this.searchByEmbedding(organizationId, vector, take, 'text')).filter(
      (result) => result.similarity >= 0.5,
    );
    // Reciprocal rank fusion preserves exact product names/SKUs while adding semantic matches.
    const scores = new Map<string, { result: CatalogSearchResult; score: number }>();
    for (const list of [lexical, semantic])
      list.forEach((result, rank) => {
        const previous = scores.get(result.product_id);
        scores.set(result.product_id, {
          result: { ...previous?.result, ...result },
          score: (previous?.score ?? 0) + 1 / (60 + rank + 1),
        });
      });
    return [...scores.values()]
      .sort((a, b) => b.score - a.score)
      .slice(0, take)
      .map((item) => item.result);
  }

  private async keywordSearch(
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
      const hay =
        `${p.title} ${p.description ?? ''} ${p.variants.map((v) => v.name).join(' ')}`.toLowerCase();
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
  'a',
  'the',
  'is',
  'are',
  'i',
  'me',
  'my',
  'we',
  'you',
  'and',
  'or',
  'ki',
  'ta',
  'ami',
  'apnar',
  'apnake',
  'tomar',
  'amar',
  'koto',
  'ache',
  'achi',
  'size',
  'please',
  'ektu',
]);
function tokenize(q: string): string[] {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = words.filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return Array.from(new Set(out));
}
