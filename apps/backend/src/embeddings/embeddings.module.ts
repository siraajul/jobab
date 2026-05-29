import { Global, Module } from '@nestjs/common';
import { JinaEmbeddingProvider } from './jina.provider';

@Global()
@Module({
  providers: [JinaEmbeddingProvider],
  exports: [JinaEmbeddingProvider],
})
export class EmbeddingsModule {}
