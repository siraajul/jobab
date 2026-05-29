import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions';
import { LlmCallOptions, LlmCallResult, LlmProvider } from './provider';

/**
 * Groq provider — uses Groq's OpenAI-compatible endpoint with the `openai`
 * SDK. Default model is `llama-3.3-70b-versatile` (good tool-calling, fast).
 *
 * Bangla note: Llama 3.3 handles Bangla decently but is weaker than Gemini.
 * Re-evaluate against the eval set (spec §13) before customers rely on it.
 */

const PRICING: Record<string, { input: number; output: number }> = {
  // Published Groq list prices (per 1M tokens). Update on changes.
  'llama-3.3-70b-versatile': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'llama-3.1-70b-versatile': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'llama-3.1-8b-instant': { input: 0.05 / 1_000_000, output: 0.08 / 1_000_000 },
  'llama3-70b-8192': { input: 0.59 / 1_000_000, output: 0.79 / 1_000_000 },
  'mixtral-8x7b-32768': { input: 0.24 / 1_000_000, output: 0.24 / 1_000_000 },
};

@Injectable()
export class GroqProvider implements LlmProvider {
  readonly name = 'groq';
  private readonly log = new Logger(GroqProvider.name);
  private client: OpenAI | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): OpenAI {
    if (this.client) return this.client;
    const apiKey = this.config.get<string>('LLM_API_KEY');
    if (!apiKey || apiKey === 'replace-me') {
      throw new Error('LLM_API_KEY not set');
    }
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
    return this.client;
  }

  async call(options: LlmCallOptions): Promise<LlmCallResult> {
    const apiKey = this.config.get<string>('LLM_API_KEY');
    if (!apiKey || apiKey === 'replace-me') {
      this.log.warn('LLM_API_KEY not set — returning placeholder reply');
      return {
        text: '[stub reply — set LLM_API_KEY to enable Groq]',
        toolCalls: [],
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }

    const messages = this.toOpenAiMessages(options.messages);
    const tools: ChatCompletionTool[] = options.tools.map((t) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters as Record<string, unknown>,
      },
    }));

    const completion = await this.getClient().chat.completions.create({
      model: options.model,
      messages,
      tools: tools.length > 0 ? tools : undefined,
      tool_choice: tools.length > 0 ? 'auto' : undefined,
      max_completion_tokens: options.maxOutputTokens ?? 1024,
    });

    const choice = completion.choices[0];
    const toolCalls = (choice.message.tool_calls ?? []).map((tc, idx) => ({
      // function-style tool calls only — Groq doesn't currently emit non-fn types
      id: tc.id ?? `call_${Date.now()}_${idx}`,
      name: (tc as { function: { name: string } }).function.name,
      arguments: safeParseArgs((tc as { function: { arguments: string } }).function.arguments),
    }));

    const inputTokens = completion.usage?.prompt_tokens ?? 0;
    const outputTokens = completion.usage?.completion_tokens ?? 0;
    const pricing = PRICING[options.model] ?? PRICING['llama-3.3-70b-versatile'];
    const costUsd = inputTokens * pricing.input + outputTokens * pricing.output;

    return {
      text: choice.message.content?.trim() || undefined,
      toolCalls,
      inputTokens,
      outputTokens,
      costUsd,
    };
  }

  private toOpenAiMessages(messages: LlmMessageList): ChatCompletionMessageParam[] {
    const out: ChatCompletionMessageParam[] = [];
    for (const m of messages) {
      if (m.role === 'system') {
        out.push({ role: 'system', content: m.content });
      } else if (m.role === 'user') {
        out.push({ role: 'user', content: m.content });
      } else if (m.role === 'assistant') {
        const calls = m.toolCalls ?? [];
        if (calls.length > 0) {
          out.push({
            role: 'assistant',
            content: m.content || null,
            tool_calls: calls.map((c) => ({
              id: c.id,
              type: 'function',
              function: { name: c.name, arguments: JSON.stringify(c.arguments) },
            })),
          });
        } else {
          out.push({ role: 'assistant', content: m.content });
        }
      } else if (m.role === 'tool') {
        out.push({
          role: 'tool',
          tool_call_id: m.toolCallId ?? '',
          content: m.content,
        });
      }
    }
    return out;
  }
}

type LlmMessageList = LlmCallOptions['messages'];

function safeParseArgs(s: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(s);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
