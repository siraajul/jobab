import * as Sentry from '@sentry/node';

/**
 * Initialise Sentry if `SENTRY_DSN` is set; otherwise no-op. Called from
 * `main.ts` before Nest bootstrap so the first error catches.
 *
 * Why a plain init function (not a Nest module): Sentry's recommended
 * lifecycle is *very* early — before app construction. A Nest module would
 * miss errors during DI setup.
 */
export function initSentry(opts: {
  dsn?: string;
  environment?: string;
  release?: string;
}): void {
  if (!opts.dsn) return;
  Sentry.init({
    dsn: opts.dsn,
    environment: opts.environment ?? 'development',
    release: opts.release,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.0,
    integrations: [Sentry.httpIntegration()],
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) scope.setContext('error_context', context);
    Sentry.captureException(err);
  });
}

export const sentry = Sentry;
