/**
 * Standalone agent worker process. Run with `pnpm --filter @jobab/backend start:worker:dev`.
 * Uses a Nest standalone application so the worker shares the same DI graph
 * (Prisma, services, env, encryption) as the API.
 */
import 'reflect-metadata';
import { writeFile } from 'node:fs/promises';
import { captureError, initSentry } from '../observability/sentry';
import { NestFactory } from '@nestjs/core';
import { Module, Logger } from '@nestjs/common';
import { Worker, UnrecoverableError, type ConnectionOptions } from 'bullmq';
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
import { AgentRuntimeService } from './agent-runtime.service';
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
  initSentry({ dsn: process.env.SENTRY_DSN, environment: process.env.SENTRY_ENVIRONMENT });
  const log = new Logger('AgentWorker');
  const app = await NestFactory.createApplicationContext(WorkerModule, { abortOnError: false });

  const agent = app.get(AgentService);
  const env = app.get(EnvService);
  const runtime = app.get(AgentRuntimeService);
  const connection: ConnectionOptions = { url: env.get('REDIS_URL') };

  const worker = new Worker<AgentJobData>(
    AGENT_QUEUE,
    async (job) => {
      await runtime.runExclusive(job.data.conversationId, () =>
        agent.handleMessage(job.data.conversationId, job.data.messageId),
      );
    },
    { connection, concurrency: 4 },
  );

  worker.on('failed', (job, err) => {
    log.error(`agent job failed id=${job?.id} attempts=${job?.attemptsMade}`);
    captureError(err, { jobId: job?.id });
    if (
      job &&
      (err instanceof UnrecoverableError || job.attemptsMade >= (job.opts.attempts ?? 1)) &&
      env.get('ALERT_WEBHOOK_URL')
    ) {
      void fetch(env.get('ALERT_WEBHOOK_URL')!, {
        method: 'POST',
        signal: AbortSignal.timeout(5000),
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event: 'jobab.agent_job_exhausted', jobId: job.id }),
      }).catch(() => log.error('failure alert delivery failed'));
    }
  });
  worker.on('completed', (job) => log.log(`job ${job.id} done`));
  log.log(`[jobab-worker] listening on queue ${AGENT_QUEUE}`);

  const heartbeat = async () => {
    try {
      if ((await worker.client).status !== 'ready') throw new Error('Redis disconnected');
      await writeFile('/tmp/jobab-worker-heartbeat', String(Date.now()));
    } catch {
      log.error('worker heartbeat failed');
    }
  };
  await heartbeat();
  const timer = setInterval(() => {
    void heartbeat();
  }, 20000);
  timer.unref();
  const shutdown = async () => {
    clearInterval(timer);
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
