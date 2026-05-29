/**
 * Vision provider — describes a customer image, then (later) confirms whether
 * any of the top-K catalog candidates is a match. Two methods so we can swap
 * the heavy "confirm" step independently of the lightweight "describe" step.
 */

export interface ImageDescription {
  /** Short canonical description for catalog search (e.g. "red cotton saree with gold zari border"). */
  description: string;
  /** Loose keyword tokens — used to boost text search ranking. */
  keywords: string[];
  /** "saree" | "three-piece" | "kurti" | "shirt" | … */
  category?: string;
}

export interface ConfirmMatchInput {
  customerImageUrl: string;
  candidates: Array<{
    productId: string;
    title: string;
    imageUrl?: string | null;
    description?: string | null;
  }>;
}

export interface ConfirmMatchResult {
  /** Picked candidate id, or null if no candidate is a confident match. */
  matchedProductId: string | null;
  /** 0.0-1.0 confidence the model has in the chosen candidate. */
  confidence: number;
  /** Short explanation (used in fallback "which one?" replies). */
  notes?: string;
}

export interface VisionProvider {
  readonly name: string;
  describe(imageUrl: string): Promise<ImageDescription>;
  confirmMatch(input: ConfirmMatchInput): Promise<ConfirmMatchResult>;
}
