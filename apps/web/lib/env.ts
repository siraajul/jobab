import { z } from 'zod';

/**
 * Validated client env (only NEXT_PUBLIC_* — these end up in the bundle).
 * Server-only env is validated separately inside the api routes.
 */
const PublicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_ORG_ID: z.string().min(1).default('org_rongdhonu'),
});

const ServerEnvSchema = z.object({
  DEV_PASSWORD: z.string().min(8, 'DEV_PASSWORD must be at least 8 characters').default('change-me'),
});

export const publicEnv = PublicEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_ORG_ID: process.env.NEXT_PUBLIC_ORG_ID,
});

/** Only call from server code (route handlers, server components). */
export function serverEnv() {
  return ServerEnvSchema.parse({ DEV_PASSWORD: process.env.DEV_PASSWORD });
}
