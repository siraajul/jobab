import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmCallOptions, LlmCallResult, LlmProvider, LlmToolCall } from './provider';

/**
 * Deterministic stub LLM provider — used in test environments so the agent
 * loop runs end-to-end without hitting Groq / OpenAI / Gemini.
 *
 * Why this exists:
 *  - real LLM calls are slow (~0.5-2s), costly, and non-deterministic, which
 *    makes them the #1 source of flakiness in API and e2e tests
 *  - with `LLM_PROVIDER=stub` set, every agent run returns the canned reply
 *    below (or whatever `LLM_STUB_REPLIES` provides), with zero tokens, zero
 *    cost, and zero network calls
 *
 * Two ways to control its behaviour from a test:
 *
 *   1. Plain text reply (default):
 *      Set `LLM_PROVIDER=stub`. Every call resolves to
 *      `"Stub reply (provider=stub)."` with no tool calls.
 *
 *   2. Scripted multi-turn:
 *      Set `LLM_STUB_REPLIES` to a JSON array, e.g.
 *        '[{"text":"hi"},{"toolCalls":[{"name":"search_catalog","arguments":{"query":"saree"}}]},{"text":"done"}]'
 *      Each agent-loop iteration consumes the next entry; falls back to the
 *      default reply once the script is exhausted.
 *
 * The stub is registered alongside `GroqProvider` and picked at boot via a
 * factory in `AgentModule` based on `LLM_PROVIDER`.
 */

interface StubScriptEntry {
  text?: string;
  toolCalls?: Array<{ name: string; arguments?: Record<string, unknown> }>;
}

@Injectable()
export class StubLlmProvider implements LlmProvider {
  readonly name = 'stub';
  private readonly log = new Logger(StubLlmProvider.name);
  private script: StubScriptEntry[] | null = null;
  private cursor = 0;

  constructor(private readonly config: ConfigService) {
    const raw = this.config.get<string>('LLM_STUB_REPLIES');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StubScriptEntry[];
        if (Array.isArray(parsed)) {
          this.script = parsed;
          this.log.log(`Loaded ${parsed.length} scripted stub reply(ies).`);
        }
      } catch (err) {
        this.log.warn(`LLM_STUB_REPLIES is not valid JSON; ignoring (${(err as Error).message}).`);
      }
    }
  }

  async call(_options: LlmCallOptions): Promise<LlmCallResult> {
    const entry = this.next();
    const toolCalls: LlmToolCall[] = (entry?.toolCalls ?? []).map((tc, i) => ({
      id: `stub_${Date.now()}_${i}`,
      name: tc.name,
      arguments: tc.arguments ?? {},
    }));
    return {
      text: toolCalls.length > 0 ? undefined : (entry?.text ?? 'Stub reply (provider=stub).'),
      toolCalls,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
  }

  private next(): StubScriptEntry | undefined {
    if (!this.script || this.cursor >= this.script.length) return undefined;
    return this.script[this.cursor++];
  }
}
