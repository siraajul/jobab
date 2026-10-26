import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from './embedding-provider';

/**
 * Jina embeddings:
 *  - text:  jina-embeddings-v3 (multilingual, strong Bengali support, 1024-dim)
 *  - image: jina-clip-v2 (multimodal, 1024-dim, a separate embedding space from v3)
 *
 * Both endpoints accept identical request shape. We unify on 1024-dim so the
 * products.text_embedding and products.image_embedding columns can live in
 * one schema.
 */

const TEXT_MODEL = 'jina-embeddings-v3';
const IMAGE_MODEL = 'jina-clip-v2';
const DIM = 1024;

@Injectable()
export class JinaEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'jina';
  readonly dim = DIM;
  private readonly log = new Logger(JinaEmbeddingProvider.name);

  constructor(private readonly config: ConfigService) {}

  get available(): boolean {
    const k = this.config.get<string>('JINA_API_KEY');
    return !!k && k !== 'replace-me';
  }

  async embedText(
    input: string,
    task: 'retrieval.query' | 'retrieval.passage' = 'retrieval.passage',
  ): Promise<number[] | null> {
    if (!this.available) return null;
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;
    return this.callEmbed(TEXT_MODEL, [{ text: trimmed }], task);
  }

  async embedImage(imageUrl: string): Promise<number[] | null> {
    if (!this.available) return null;
    return this.callEmbed(IMAGE_MODEL, [{ image: imageUrl }]);
  }

  private async callEmbed(
    model: string,
    input: Array<{ text?: string; image?: string }>,
    task?: string,
  ): Promise<number[] | null> {
    try {
      const res = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        signal: AbortSignal.timeout(this.config.get<number>('PROVIDER_TIMEOUT_MS') ?? 15000),
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.get<string>('JINA_API_KEY')}`,
        },
        body: JSON.stringify({
          model,
          task,
          input,
          encoding_type: 'float',
          dimensions: DIM,
        }),
      });
      if (!res.ok) {
        this.log.warn(`Jina embedding request failed (${res.status})`);
        return null;
      }
      const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
      const embedding = json.data?.[0]?.embedding;
      return Array.isArray(embedding) &&
        embedding.length === DIM &&
        embedding.every(Number.isFinite) &&
        embedding.some((v) => v !== 0)
        ? embedding
        : null;
    } catch (err) {
      this.log.warn(`Jina ${model} error: ${(err as Error).message}`);
      return null;
    }
  }
}
