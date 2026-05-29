import { Global, Module } from '@nestjs/common';
import { AgentQueueService } from './agent-queue.service';

@Global()
@Module({
  providers: [AgentQueueService],
  exports: [AgentQueueService],
})
export class QueueModule {}
