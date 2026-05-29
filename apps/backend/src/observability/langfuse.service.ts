import { Injectable, Logger } from '@nestjs/common';
import { Langfuse } from 'langfuse';
import { EnvService } from '../config/env.service';

/**
 * Langfuse client (spec §14). Each agent run becomes one Langfuse trace
 * with one span per LLM call + one span per tool execution. When the
 * Langfuse keys are not configured, every method is a no-op so the agent
 * loop runs unchanged.
 */

export interface TraceContext {
  trace?: ReturnType<Langfuse['trace']>;
}

@Injectable()
export class LangfuseService {
  private readonly log = new Logger(LangfuseService.name);
  private client: Langfuse | null = null;

  constructor(private readonly env: EnvService) {
    const pk = env.get('LANGFUSE_PUBLIC_KEY');
    const sk = env.get('LANGFUSE_SECRET_KEY');
    if (pk && sk) {
      this.client = new Langfuse({
        publicKey: pk,
        secretKey: sk,
        baseUrl: env.get('LANGFUSE_HOST'),
      });
    }
  }

  /** Open a trace for one agent run. Returns a context the caller threads
   *  through subsequent log calls. Safe to call when disabled — returns {}. */
  startTrace(name: string, metadata: Record<string, unknown>): TraceContext {
    if (!this.client) return {};
    return {
      trace: this.client.trace({ name, metadata }),
    };
  }

  logGeneration(
    ctx: TraceContext,
    span: { name: string; model: string; input: unknown; output: unknown; usage?: { input: number; output: number; total: number } },
  ): void {
    if (!ctx.trace) return;
    ctx.trace.generation({
      name: span.name,
      model: span.model,
      input: span.input,
      output: span.output,
      usage: span.usage,
    });
  }

  logToolCall(
    ctx: TraceContext,
    span: { name: string; input: unknown; output: unknown },
  ): void {
    if (!ctx.trace) return;
    ctx.trace.span({
      name: `tool:${span.name}`,
      input: span.input,
      output: span.output,
    });
  }

  endTrace(ctx: TraceContext, output: unknown): void {
    if (!ctx.trace) return;
    ctx.trace.update({ output });
  }

  async flush(): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.flushAsync();
    } catch (err) {
      this.log.warn(`langfuse flush failed: ${(err as Error).message}`);
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }
}
