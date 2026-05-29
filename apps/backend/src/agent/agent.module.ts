import { Module } from '@nestjs/common';
import { AgentService } from './agent.service';
import { GroqProvider } from './llm/groq.provider';
import { VisionModule } from '../vision/vision.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [VisionModule, EmbeddingsModule],
  providers: [AgentService, GroqProvider],
  exports: [AgentService],
})
export class AgentModule {}
