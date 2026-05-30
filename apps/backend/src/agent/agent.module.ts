import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentService } from './agent.service';
import { GroqProvider } from './llm/groq.provider';
import { LLM_PROVIDER } from './llm/llm.token';
import type { LlmProvider } from './llm/provider';
import { StubLlmProvider } from './llm/stub.provider';
import { VisionModule } from '../vision/vision.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [VisionModule, EmbeddingsModule],
  providers: [
    AgentService,
    GroqProvider,
    StubLlmProvider,
    {
      // Resolve the active LLM provider at boot based on LLM_PROVIDER env.
      // The stub is used in test environments so the agent loop doesn't hit
      // Groq / OpenAI / Gemini (kills the #1 source of e2e flakiness).
      provide: LLM_PROVIDER,
      useFactory: (
        config: ConfigService,
        groq: GroqProvider,
        stub: StubLlmProvider,
      ): LlmProvider => (config.get<string>('LLM_PROVIDER') === 'stub' ? stub : groq),
      inject: [ConfigService, GroqProvider, StubLlmProvider],
    },
  ],
  exports: [AgentService],
})
export class AgentModule {}
