import { z } from 'zod';
import { Tool, ToolContext } from './types';

const Input = z.object({
  image_url: z.string().url(),
});

/**
 * Hybrid image→product matching (spec §9).
 *
 *   1. Embedding stage  — embed the customer photo, run pgvector ANN over
 *      products.image_embedding for top-K candidates.
 *   2. Fallback stage    — if no image embeddings exist OR the embedding
 *      provider is unavailable, describe the photo with a vision LLM and
 *      pass the description through the text catalog search.
 *   3. Confirmation       — vision LLM looks at the customer photo alongside
 *      the candidate images and picks the best match with a confidence score.
 *
 * Returns `{ matches, confident }` so the agent can either assert the match
 * (high confidence) or ask the customer to confirm one of the candidates.
 */

const HIGH_CONFIDENCE = 0.78;
const TOP_K = 4;

export const matchProductByImageTool: Tool = {
  definition: {
    name: 'match_product_by_image',
    description:
      'Identify which catalog product a customer photo is showing. Use this whenever the customer sends an image attachment. ' +
      'Returns a `matches` array (ranked) and a `confident` flag. If confident, you may tell the customer the matched product directly. ' +
      'If not, present the top 2-3 candidates and ask "Is this the one?".',
    parameters: {
      type: 'object',
      properties: {
        image_url: { type: 'string', description: 'Public URL of the customer image.' },
      },
      required: ['image_url'],
      additionalProperties: false,
    },
  },
  async execute(input: unknown, ctx: ToolContext) {
    const { image_url } = Input.parse(input);

    // ── Stage 1: visual embedding ANN ────────────────────────────────────
    let candidates: Array<{
      productId: string;
      title: string;
      description: string | null;
      imageUrl: string | null;
      score: number;
    }> = [];

    if (ctx.embeddings.available) {
      const queryVec = await ctx.embeddings.embedImage(image_url);
      if (queryVec) {
        const visual = await ctx.catalog.searchByImageEmbedding(
          ctx.organizationId,
          queryVec,
          TOP_K,
        );
        candidates = visual.map((v) => ({
          productId: v.product_id,
          title: v.title,
          description: v.description ?? null,
          imageUrl: v.image_url ?? null,
          score: v.similarity,
        }));
      }
    }

    // ── Stage 2 (fallback): describe-then-search ─────────────────────────
    if (candidates.length === 0) {
      const desc = await ctx.vision.describe(image_url);
      const query =
        [desc.description, desc.category, ...desc.keywords].filter(Boolean).join(' ') ||
        'product';
      const text = await ctx.catalog.search(ctx.organizationId, query, TOP_K);
      candidates = text.map((t) => ({
        productId: t.product_id,
        title: t.title,
        description: null,
        imageUrl: null,
        score: 0.4, // unknown — set below high-confidence threshold so we still confirm
      }));
    }

    if (candidates.length === 0) {
      return { matches: [], confident: false, reason: 'no_candidates' };
    }

    // ── Stage 3: vision LLM confirmation ────────────────────────────────
    const verdict = await ctx.vision.confirmMatch({
      customerImageUrl: image_url,
      candidates: candidates.map((c) => ({
        productId: c.productId,
        title: c.title,
        imageUrl: c.imageUrl,
        description: c.description,
      })),
    });

    const confident =
      verdict.matchedProductId !== null && verdict.confidence >= HIGH_CONFIDENCE;

    // Rank: matched candidate first, then the rest by ANN score.
    const ranked = candidates.slice().sort((a, b) => {
      if (a.productId === verdict.matchedProductId) return -1;
      if (b.productId === verdict.matchedProductId) return 1;
      return b.score - a.score;
    });

    return {
      matches: ranked.slice(0, 3).map((c) => ({
        product_id: c.productId,
        title: c.title,
        score: c.productId === verdict.matchedProductId ? verdict.confidence : c.score,
      })),
      confident,
      notes: verdict.notes,
    };
  },
};
