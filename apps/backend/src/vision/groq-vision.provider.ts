import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { ChatCompletionContentPart } from 'openai/resources/chat/completions';
import {
  ConfirmMatchInput,
  ConfirmMatchResult,
  ImageDescription,
  VisionProvider,
} from './vision-provider';

/**
 * Groq vision-LLM. Default model: meta-llama/llama-4-scout-17b-16e-instruct
 * which supports multiple image inputs at once — needed for the "confirm
 * among candidates" step.
 *
 * The provider returns strict JSON (extracted from the model output). When
 * the customer photo is unreachable, falls back to a low-confidence empty
 * description so the agent can degrade gracefully.
 */

const DEFAULT_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

@Injectable()
export class GroqVisionProvider implements VisionProvider {
  readonly name = 'groq-vision';
  private readonly log = new Logger(GroqVisionProvider.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('LLM_API_KEY');
    if (!apiKey || apiKey === 'replace-me') throw new Error('LLM_API_KEY not set');
    this.client = new OpenAI({ apiKey, baseURL: 'https://api.groq.com/openai/v1' });
    return this.client;
  }

  private model(): string {
    return this.config.get<string>('VISION_MODEL') ?? DEFAULT_MODEL;
  }

  async describe(imageUrl: string): Promise<ImageDescription> {
    const prompt =
      'You are helping a Bangladeshi clothing merchant identify a product from a customer photo. ' +
      'Reply in STRICT JSON only, no prose: ' +
      '{"description": "<3-12 words, English>", "keywords": ["…"], "category": "saree|three_piece|kurti|shirt|other"}. ' +
      'Focus on visible material, colour, pattern. Be specific (e.g. "red cotton saree with gold zari border").';

    try {
      const res = await this.getClient().chat.completions.create({
        model: this.model(),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ] as ChatCompletionContentPart[],
          },
        ],
        max_completion_tokens: 200,
        response_format: { type: 'json_object' },
      });
      const text = res.choices[0]?.message.content ?? '{}';
      const parsed = safeParse(text);
      return {
        description: parsed.description?.toString().slice(0, 200) ?? '',
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String).slice(0, 8) : [],
        category: parsed.category?.toString(),
      };
    } catch (err) {
      this.log.warn(`describe failed: ${(err as Error).message}`);
      return { description: '', keywords: [] };
    }
  }

  async confirmMatch(input: ConfirmMatchInput): Promise<ConfirmMatchResult> {
    if (input.candidates.length === 0) {
      return { matchedProductId: null, confidence: 0 };
    }

    const candidateList = input.candidates
      .map((c, i) => `${i + 1}. id=${c.productId} · ${c.title}${c.description ? ` — ${c.description}` : ''}`)
      .join('\n');

    // Build multimodal content: customer photo + each candidate image (when
    // available). Cap at 6 images total (Groq's vision context limit).
    const contentParts: ChatCompletionContentPart[] = [
      {
        type: 'text',
        text:
          'You are matching a customer photo to one of the merchant\'s products.\n\n' +
          'CUSTOMER PHOTO (first image):\n' +
          'CANDIDATES (in order):\n' +
          candidateList +
          '\n\n' +
          'Reply in STRICT JSON only: {"matched_product_id": "<id or null>", "confidence": 0.0-1.0, "notes": "<one short sentence>"}. ' +
          'Use confidence 0.85+ ONLY if the customer photo is clearly the same product. ' +
          'If unsure, set matched_product_id to null and confidence to your best estimate.',
      },
      { type: 'image_url', image_url: { url: input.customerImageUrl } },
    ];
    for (const c of input.candidates.slice(0, 4)) {
      if (c.imageUrl) {
        contentParts.push({ type: 'image_url', image_url: { url: c.imageUrl } });
      }
    }

    try {
      const res = await this.getClient().chat.completions.create({
        model: this.model(),
        messages: [{ role: 'user', content: contentParts }],
        max_completion_tokens: 200,
        response_format: { type: 'json_object' },
      });
      const text = res.choices[0]?.message.content ?? '{}';
      const parsed = safeParse(text);
      const id = parsed.matched_product_id ?? parsed.matchedProductId ?? null;
      const conf = Number(parsed.confidence ?? 0);
      return {
        matchedProductId: typeof id === 'string' && id.length > 0 ? id : null,
        confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0,
        notes: typeof parsed.notes === 'string' ? parsed.notes : undefined,
      };
    } catch (err) {
      this.log.warn(`confirmMatch failed: ${(err as Error).message}`);
      return { matchedProductId: null, confidence: 0 };
    }
  }
}

function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    // The model sometimes wraps JSON in fences; try to recover.
    const match = s.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
}
