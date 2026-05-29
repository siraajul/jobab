import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { CommentIntent } from '@prisma/client';
import { EnvService } from '../config/env.service';

export interface ClassifiedIntent {
  intent: CommentIntent;
  confidence: number;
  reasoning?: string;
}

const SYSTEM_PROMPT = [
  'You classify Bangladeshi social-commerce Facebook comments into one intent.',
  '',
  'Intents:',
  '- "price"     : asking about price (e.g. "price?", "koto", "dam koto", "kemon").',
  '- "buy"       : explicit purchase intent (e.g. "amake ekta lagbe", "order korbo", "kintec hai").',
  '- "question"  : product question (size, color, availability, delivery time, fabric).',
  '- "other"     : compliments, emojis-only, greetings, off-topic.',
  '- "spam"      : promotion of unrelated business, abuse, scam links.',
  '',
  'Reply with STRICT JSON only: {"intent":"price|buy|question|other|spam","confidence":0..1,"reasoning":"<1 line>"}.',
].join('\n');

@Injectable()
export class IntentClassifier {
  private readonly log = new Logger(IntentClassifier.name);
  private client: OpenAI | null = null;

  constructor(private readonly env: EnvService) {}

  private getClient(): OpenAI {
    if (this.client) return this.client;
    this.client = new OpenAI({
      apiKey: this.env.get('LLM_API_KEY'),
      baseURL: 'https://api.groq.com/openai/v1',
    });
    return this.client;
  }

  async classify(commentText: string): Promise<ClassifiedIntent> {
    const text = commentText.trim();
    if (text.length === 0) {
      return { intent: 'other', confidence: 1, reasoning: 'empty' };
    }

    // Cheap heuristic short-circuit for obvious spam emoji bursts / known
    // price tokens; saves a model call on the majority of comments.
    const heuristic = quickHeuristic(text);
    if (heuristic) return heuristic;

    try {
      const res = await this.getClient().chat.completions.create({
        model: this.env.get('LLM_MODEL'),
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: text },
        ],
        max_completion_tokens: 120,
        response_format: { type: 'json_object' },
      });
      const raw = res.choices[0]?.message.content ?? '{}';
      const parsed = safeParse(raw);
      const intent = normaliseIntent(parsed.intent);
      const confidence = clamp01(Number(parsed.confidence ?? 0.5));
      return {
        intent,
        confidence,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : undefined,
      };
    } catch (err) {
      this.log.warn(`classify failed: ${(err as Error).message}`);
      // On model error, default to "question" with low confidence so the
      // merchant decides — never silently drop a real customer.
      return { intent: 'question', confidence: 0.2, reasoning: 'classifier_error' };
    }
  }
}

function quickHeuristic(text: string): ClassifiedIntent | null {
  const lower = text.toLowerCase();
  const priceTokens = ['price', 'dam', 'daam', 'koto', 'কত', 'দাম'];
  if (priceTokens.some((t) => lower.includes(t))) {
    return { intent: 'price', confidence: 0.92, reasoning: 'heuristic:price token' };
  }
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return { intent: 'other', confidence: 0.95, reasoning: 'heuristic:emoji only' };
  }
  return null;
}

function normaliseIntent(v: unknown): CommentIntent {
  const s = String(v ?? '').toLowerCase();
  if (s === 'price' || s === 'buy' || s === 'question' || s === 'spam') return s as CommentIntent;
  return 'other';
}
function clamp01(n: number) {
  if (!Number.isFinite(n)) return 0.5;
  return Math.max(0, Math.min(1, n));
}
function safeParse(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]) as Record<string, unknown>;
      } catch {
        return {};
      }
    }
    return {};
  }
}
