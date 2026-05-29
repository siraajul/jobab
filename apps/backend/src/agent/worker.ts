/**
 * Standalone agent worker process. Run with `pnpm --filter @jobab/backend start:worker:dev`.
 * Uses a Nest standalone application so the worker shares the same DI graph
 * (Prisma, services, env, encryption) as the API.
 */
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { Worker, type ConnectionOptions } from 'bullmq';
import { EnvModule } from '../config/env.module';
import { ObservabilityModule } from '../observability/observability.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EnvService } from '../config/env.service';
import { EncryptionModule } from '../common/encryption/encryption.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersModule } from '../orders/orders.module';
import { CatalogModule } from '../catalog/catalog.module';
import { MessengerModule } from '../messenger/messenger.module';
import { PaymentsModule } from '../payments/payments.module';
import { VisionModule } from '../vision/vision.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { AgentModule } from './agent.module';
import { AgentService } from './agent.service';
import { AGENT_QUEUE, AgentJobData } from '../queue/queue.constants';

@Module({
  imports: [
    EnvModule,
    ObservabilityModule,
    NotificationsModule,
    EncryptionModule,
    PrismaModule,
    VisionModule,
    EmbeddingsModule,
    PaymentsModule,
    OrdersModule,
    CatalogModule,
    MessengerModule,
    AgentModule,
  ],
})
class WorkerModule {}

async function main() {
  const log = new Logger('AgentWorker');
  const app = await NestFactory.createApplicationContext(WorkerModule, { abortOnError: false });

  const agent = app.get(AgentService);
  const env = app.get(EnvService);
  const connection: ConnectionOptions = { url: env.get('REDIS_URL') };

  const worker = new Worker<AgentJobData>(
    AGENT_QUEUE,
    async (job) => {
      await agent.handleMessage(job.data.conversationId, job.data.messageId);
    },
    { connection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => log.error(`job ${job?.id} failed: ${err.message}`));
  worker.on('completed', (job) => log.log(`job ${job.id} done`));
  log.log(`[jobab-worker] listening on queue ${AGENT_QUEUE}`);

  const shutdown = async () => {
    log.log('shutting down…');
    await worker.close();
    await app.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
