import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, type ConnectionOptions } from 'bullmq';
import { AGENT_QUEUE, AgentJobData } from './queue.constants';

@Injectable()
export class AgentQueueService implements OnModuleDestroy {
  private readonly queue: Queue<AgentJobData>;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    // BullMQ accepts a connection-string options object directly; passing an
    // already-built ioredis instance trips up the bundled @types/ioredis
    // mismatch, so let BullMQ construct its own client.
    const connection: ConnectionOptions = { url };
    this.queue = new Queue<AgentJobData>(AGENT_QUEUE, { connection });
  }

  enqueue(data: AgentJobData) {
    return this.queue.add('handle-message', data, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }

  async onModuleDestroy() {
    await this.queue.close();
  }
}
