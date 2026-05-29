import 'reflect-metadata';
import { initSentry } from './observability/sentry';
initSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
});
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import {
  json,
  raw,
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));

  app.use(helmet());
  app.use(cookieParser());

  // Raw body only on the signature-validated webhook (the exact `/webhooks/meta`
  // POST). Everything else — including `/webhooks/meta/fake` — gets JSON.
  app.use('/webhooks/meta', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && (req.url === '/' || req.url === '')) {
      return raw({ type: '*/*' })(req, res, next);
    }
    return next();
  });
  app.use(json({ limit: '1mb' }));

  const env = app.get(EnvService);
  app.enableCors({
    origin: env.get('WEB_ORIGIN').split(','),
    credentials: true,
    allowedHeaders: ['content-type', 'x-org-id', 'x-request-id'],
    exposedHeaders: ['x-request-id'],
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  const docConfig = new DocumentBuilder()
    .setTitle('Jobab API')
    .setDescription('AI sales agent for Bangladeshi social commerce.')
    .setVersion('0.1.0')
    .addTag('conversations')
    .addTag('orders')
    .addTag('catalog')
    .addTag('analytics')
    .addTag('settings')
    .addTag('onboarding')
    .addTag('health')
    .build();
  const doc = SwaggerModule.createDocument(app, docConfig);
  SwaggerModule.setup('docs', app, doc, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = env.get('PORT');
  await app.listen(port);
  app.get(PinoLogger).log(`[jobab-api] listening on :${port} · docs at /docs`);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
