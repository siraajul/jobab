import 'reflect-metadata';
import { initSentry } from './observability/sentry';
initSentry({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT,
});
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { Logger as PinoLogger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, raw, type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { EnvService } from './config/env.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { zodRegistry } from './swagger/zod-registry';

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
    .setDescription(
      [
        '**An AI sales agent for Bangladeshi social-commerce merchants.**',
        '',
        'New here? Read this first:',
        '',
        '1. **Auth is a session cookie.** Call `POST /auth/login` with your email + password.',
        '   The server sets a `session` cookie. Include it on every subsequent request',
        '   (browsers do this automatically; with `curl` use `-c cookies.txt -b cookies.txt`).',
        '2. **Active org is implicit.** Once logged in your active org is derived from the',
        '   session. Switch with `POST /auth/active-org` if you belong to several.',
        '3. **All request / response bodies are typed.** Every shape under `Schemas` below',
        '   is the same Zod schema the backend uses to validate at runtime — what you see',
        '   is what the server enforces.',
        '4. **Errors all look the same** — see the `ApiError` schema. Common codes:',
        '   `401` (no session) · `403` (wrong org / role) · `404` (not found) ·',
        '   `422` (body failed validation) · `500` (we logged it, please retry).',
        '5. **Click "Authorize"** below and the "Try it out" button on any endpoint to',
        '   call the live API from this page.',
        '',
        'Source: https://github.com/siraajul/jobab',
      ].join('\n'),
    )
    .setVersion('0.1.0')
    .setContact('Jobab', 'https://github.com/siraajul/jobab', 'support@jobab.dev')
    .setLicense('Proprietary', '')
    .setExternalDoc('Full README', 'https://github.com/siraajul/jobab#readme')
    .addServer(`http://localhost:${env.get('PORT')}`, 'Local dev')
    .addCookieAuth('session', {
      type: 'apiKey',
      in: 'cookie',
      name: 'session',
      description:
        'Session cookie set by `POST /auth/login`. Persisted by your browser; with `curl` use `-c cookies.txt -b cookies.txt`.',
    })
    .addTag('auth', 'Login, sign-up, invites, session.')
    .addTag('conversations', 'The inbox — list / read / reply / take over / tag / note.')
    .addTag('tags', 'Colour-coded labels you attach to conversations.')
    .addTag('orders', 'Orders the AI or merchant has taken, with lifecycle status.')
    .addTag('catalog', 'Products and variants (CSV / Shopify / WooCommerce sync).')
    .addTag('team', 'Org members, invites, conversation assignment.')
    .addTag('comments', 'Captured Facebook / Instagram comments and auto-reply rules.')
    .addTag('analytics', 'Dashboard summary — conversations, revenue, tokens, cost.')
    .addTag('settings', 'Shop name, AI instructions, channel toggles.')
    .addTag('onboarding', 'Connect-pages → catalog → live flow.')
    .addTag('push', 'Device push-notification token registration.')
    .addTag('webhooks', 'Inbound from Meta — signature-verified. Public, no cookie.')
    .addTag('health', 'Liveness & readiness probes. Public, no cookie.')
    .build();
  const doc = SwaggerModule.createDocument(app, docConfig);

  // Merge `components/schemas` generated from @jobab/shared Zod schemas. This
  // is what makes every `$ref: '#/components/schemas/<Name>'` in our decorators
  // resolve to a real, accurate shape in the Swagger UI.
  //
  // zod-to-openapi uses `openapi3-ts` types; @nestjs/swagger has its own
  // structurally-identical SchemaObject. We cast through `unknown` so Swagger
  // sees its own type without us re-implementing the OpenAPI spec.
  const zodComponents = new OpenApiGeneratorV3(zodRegistry.definitions).generateComponents();
  const zodSchemas = (zodComponents.components?.schemas ?? {}) as unknown as Record<
    string,
    NonNullable<NonNullable<typeof doc.components>['schemas']>[string]
  >;
  doc.components = {
    ...doc.components,
    schemas: {
      ...(doc.components?.schemas ?? {}),
      ...zodSchemas,
    },
  };

  SwaggerModule.setup('docs', app, doc, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      tryItOutEnabled: true,
      withCredentials: true,
    },
    customSiteTitle: 'Jobab API · Docs',
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
