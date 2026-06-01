import { matchProductByImageTool } from './match-product-by-image.tool';
import type { ToolContext } from './types';

/**
 * Coverage gaps the earlier tools.spec.ts skipped:
 *   - empty candidate set returns no_candidates
 *   - high-confidence verdict surfaces confident: true and ranks the match first
 *   - low-confidence verdict surfaces confident: false (caller asks customer to pick)
 *   - describe-then-search fallback when no image embeddings exist
 */

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    organizationId: 'org1',
    conversationId: 'c1',
    prisma: {} as never,
    catalog: {
      search: jest.fn(async () => []),
      searchByImageEmbedding: jest.fn(async () => []),
    } as never,
    guardrail: {} as never,
    vision: {
      describe: jest.fn(async () => ({
        description: 'red shari',
        category: 'shari',
        keywords: ['red'],
      })),
      confirmMatch: jest.fn(async () => ({
        matchedProductId: null,
        confidence: 0.1,
        notes: 'no match',
      })),
    } as never,
    embeddings: { available: false } as never,
    whatsapp: {} as never,
    ...over,
  };
}

describe('match_product_by_image tool', () => {
  it('returns no_candidates when both stages come up empty', async () => {
    const r = (await matchProductByImageTool.execute(
      { image_url: 'https://x/y.jpg' },
      ctx(),
    )) as Record<string, unknown>;
    expect(r).toMatchObject({ matches: [], confident: false, reason: 'no_candidates' });
  });

  it('marks the match as confident when verdict ≥ 0.78 threshold', async () => {
    const c = ctx({
      catalog: {
        search: jest.fn(async () => [
          { product_id: 'p1', title: 'Red shari', price: 1500, currency: 'BDT', variants: [] },
          { product_id: 'p2', title: 'Blue shari', price: 1500, currency: 'BDT', variants: [] },
        ]),
        searchByImageEmbedding: jest.fn(async () => []),
      } as never,
      vision: {
        describe: jest.fn(async () => ({
          description: 'red shari',
          category: 'shari',
          keywords: ['red'],
        })),
        confirmMatch: jest.fn(async () => ({
          matchedProductId: 'p2',
          confidence: 0.91,
          notes: 'matches palette',
        })),
      } as never,
    });
    const r = (await matchProductByImageTool.execute({ image_url: 'https://x/y.jpg' }, c)) as {
      matches: Array<{ product_id: string; score: number }>;
      confident: boolean;
    };
    expect(r.confident).toBe(true);
    // Matched candidate must be first.
    expect(r.matches[0].product_id).toBe('p2');
    expect(r.matches[0].score).toBeCloseTo(0.91);
  });

  it('marks the match as NOT confident when verdict < 0.78', async () => {
    const c = ctx({
      catalog: {
        search: jest.fn(async () => [
          { product_id: 'p1', title: 'Red shari', price: 1500, currency: 'BDT', variants: [] },
        ]),
        searchByImageEmbedding: jest.fn(async () => []),
      } as never,
      vision: {
        describe: jest.fn(async () => ({
          description: 'red shari',
          category: 'shari',
          keywords: ['red'],
        })),
        confirmMatch: jest.fn(async () => ({
          matchedProductId: 'p1',
          confidence: 0.5,
          notes: 'uncertain',
        })),
      } as never,
    });
    const r = (await matchProductByImageTool.execute({ image_url: 'https://x/y.jpg' }, c)) as {
      matches: unknown[];
      confident: boolean;
    };
    expect(r.confident).toBe(false);
    expect(r.matches).toHaveLength(1);
  });

  it('uses the embedding stage when embeddings are available', async () => {
    const searchByImageEmbedding = jest.fn(async () => [
      { product_id: 'p9', title: 'Match', similarity: 0.82, description: null, image_url: null },
    ]);
    const c = ctx({
      embeddings: {
        available: true,
        embedImage: jest.fn(async () => new Float32Array([0.1, 0.2])),
      } as never,
      catalog: {
        search: jest.fn(),
        searchByImageEmbedding: searchByImageEmbedding as never,
      } as never,
      vision: {
        describe: jest.fn(),
        confirmMatch: jest.fn(async () => ({ matchedProductId: 'p9', confidence: 0.9, notes: '' })),
      } as never,
    });
    await matchProductByImageTool.execute({ image_url: 'https://x/y.jpg' }, c);
    expect(searchByImageEmbedding).toHaveBeenCalledWith('org1', expect.anything(), 4);
  });

  it('rejects invalid image_url via zod', async () => {
    await expect(
      matchProductByImageTool.execute({ image_url: 'not-a-url' }, ctx()),
    ).rejects.toThrow();
  });
});
