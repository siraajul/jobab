/**
 * Embedding provider (spec §9 / §14). Two shapes:
 *
 *   embedText(input)  — for product titles + descriptions (catalog text search)
 *   embedImage(url)   — for product images and customer photos (visual ANN)
 *
 * Both must produce same-dimension vectors so they can be stored side-by-side
 * in pgvector. The DB column type is `vector` (unsized) so dim can vary across
 * providers, but per-org consistency matters — keep one provider per org.
 */

export interface EmbeddingProvider {
  readonly name: string;
  readonly dim: number;
  /** Available — true if the provider has credentials configured. */
  readonly available: boolean;

  embedText(input: string): Promise<number[] | null>;
  embedImage(imageUrl: string): Promise<number[] | null>;
}
