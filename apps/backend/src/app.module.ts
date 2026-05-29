import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { EnvModule } from './config/env.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { MessengerModule } from './messenger/messenger.module';
import { AgentModule } from './agent/agent.module';
import { ConversationsModule } from './conversations/conversations.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { PaymentsModule } from './payments/payments.module';
import { VisionModule } from './vision/vision.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { TeamModule } from './team/team.module';
import { CommentsModule } from './comments/comments.module';
import { PushModule } from './push/push.module';
import { ObservabilityModule } from './observability/observability.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';

@Module({
  imports: [
    EnvModule,
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
        transport:
          process.env.NODE_ENV === 'production'
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l' } },
        customProps: (req) => ({ reqId: (req as { id?: string }).id }),
        redact: {
          paths: ['req.headers.authorization', 'req.headers["x-org-id"]', '*.accessToken', '*.token'],
          remove: true,
        },
      },
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1_000, limit: 30 },
      { name: 'long', ttl: 60_000, limit: 600 },
    ]),
    EncryptionModule,
    ObservabilityModule,
    NotificationsModule,
    PrismaModule,
    AuthModule,
    QueueModule,
    VisionModule,
    EmbeddingsModule,
    CatalogModule,
    MessengerModule,
    PaymentsModule,
    OrdersModule,
    AgentModule,
    ConversationsModule,
    AnalyticsModule,
    SettingsModule,
    OnboardingModule,
    TeamModule,
    CommentsModule,
    PushModule,
    HealthModule,
    WebhooksModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
