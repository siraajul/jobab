/**
 * Single source of truth for Jobab's API contract.
 *
 * Why this package exists:
 *  - the backend (NestJS) and the web app (Next.js) both need the same shapes
 *  - hand-mirroring breaks the moment the schema changes
 *  - keeping it as Zod schemas means we get runtime validation for free
 *
 * Re-exported from both apps via `@jobab/shared`.
 */

export * from './auth';
export * from './enums';
export * from './conversation';
export * from './message';
export * from './order';
export * from './product';
export * from './analytics';
export * from './onboarding';
export * from './settings';
export * from './team';
export * from './comments';
export * from './tools';
export * from './webhooks';
