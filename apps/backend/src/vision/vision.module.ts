import { Global, Module } from '@nestjs/common';
import { GroqVisionProvider } from './groq-vision.provider';

@Global()
@Module({
  providers: [GroqVisionProvider],
  exports: [GroqVisionProvider],
})
export class VisionModule {}
