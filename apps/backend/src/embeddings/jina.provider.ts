import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmbeddingProvider } from './embedding-provider';

/**
 * Jina embeddings:
 *  - text:  jina-embeddings-v3 (multilingual, strong Bengali support, 1024-dim)
 *  - image: jina-clip-v2 (multimodal, 1024-dim — same space as v3 in clip mode)
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

  async embedText(input: string): Promise<number[] | null> {
    if (!this.available) return null;
    const trimmed = input.trim();
    if (trimmed.length === 0) return null;
    return this.callEmbed(TEXT_MODEL, [{ text: trimmed }]);
  }

  async embedImage(imageUrl: string): Promise<number[] | null> {
    if (!this.available) return null;
    return this.callEmbed(IMAGE_MODEL, [{ image: imageUrl }]);
  }

  private async callEmbed(model: string, input: Array<{ text?: string; image?: string }>): Promise<number[] | null> {
    try {
      const res = await fetch('https://api.jina.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.get<string>('JINA_API_KEY')}`,
        },
        body: JSON.stringify({
          model,
          input,
          encoding_type: 'float',
          dimensions: DIM,
        }),
      });
      if (!res.ok) {
        this.log.warn(`Jina ${model} ${res.status}: ${await res.text()}`);
        return null;
      }
      const json = (await res.json()) as { data?: Array<{ embedding: number[] }> };
      return json.data?.[0]?.embedding ?? null;
    } catch (err) {
      this.log.warn(`Jina ${model} error: ${(err as Error).message}`);
      return null;
    }
  }
}
