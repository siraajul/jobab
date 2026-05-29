import { Global, Module, OnModuleDestroy } from '@nestjs/common';
import { LangfuseService } from './langfuse.service';

@Global()
@Module({
  providers: [LangfuseService],
  exports: [LangfuseService],
})
export class ObservabilityModule implements OnModuleDestroy {
  constructor(private readonly langfuse: LangfuseService) {}
  async onModuleDestroy() {
    await this.langfuse.flush();
  }
}
