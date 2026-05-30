import { z } from 'zod';

/**
 * Zod schema validating *every* environment variable the backend reads.
 * Validated at boot in `ConfigModule.forRoot({ validate })`; mistyped or
 * missing values fail-fast with a clear error instead of mysteriously
 * undefined-ing inside services.
 *
 * The inferred `Env` type drives a typed `EnvConfig` service used everywhere
 * instead of stringly-typed `config.get<string>('FOO')` calls.
 */

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),

    DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
    REDIS_URL: z.string().url().or(z.string().startsWith('redis://')),

    // Meta / Facebook
    META_APP_SECRET: z.string().min(1),
    META_VERIFY_TOKEN: z.string().min(1),
    META_GRAPH_VERSION: z.string().default('v20.0'),
    MESSENGER_DRY_RUN: z.coerce.boolean().default(true),

    // LLM (chat/tool-calling). `stub` is the in-memory deterministic provider
    // used in tests; it doesn't need an API key. See `agent/llm/stub.provider.ts`.
    LLM_PROVIDER: z.enum(['groq', 'gemini', 'openai', 'stub']).default('groq'),
    LLM_MODEL: z.string().default('llama-3.3-70b-versatile'),
    LLM_API_KEY: z.string().optional(),
    LLM_MAX_ITERATIONS: z.coerce.number().int().min(1).max(20).default(5),
    LLM_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(64).max(4096).default(1024),
    /** JSON array of scripted stub replies — only read when LLM_PROVIDER=stub. */
    LLM_STUB_REPLIES: z.string().optional(),

    // Vision (multimodal)
    VISION_MODEL: z.string().default('meta-llama/llama-4-scout-17b-16e-instruct'),

    // Embeddings (Jina) — optional, falls back to describe-then-search
    JINA_API_KEY: z.string().optional(),

    // Observability (all optional — degrade gracefully when absent)
    SENTRY_DSN: z.string().optional(),
    SENTRY_ENVIRONMENT: z.string().default('development'),
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_HOST: z.string().default('https://cloud.langfuse.com'),

    // WhatsApp notifications (Twilio or compatible) — optional
    WA_PROVIDER: z.enum(['twilio', 'gupshup']).default('twilio'),
    WA_ACCOUNT_SID: z.string().optional(),
    WA_AUTH_TOKEN: z.string().optional(),
    WA_FROM: z.string().optional(),

    // Token encryption (page access tokens, catalog credentials)
    ENCRYPTION_KEY: z
      .string()
      .min(
        32,
        'ENCRYPTION_KEY must be at least 32 characters (use a 32-byte base64 key for AES-256-GCM)',
      ),

    // CORS / web origin
    WEB_ORIGIN: z.string().default('http://localhost:3001'),

    // Public URL used in webhook + payment callbacks
    PUBLIC_URL: z.string().url().default('http://localhost:3000'),

    // bKash (all optional — dev fallback returns a placeholder URL)
    BKASH_USERNAME: z.string().optional(),
    BKASH_PASSWORD: z.string().optional(),
    BKASH_APP_KEY: z.string().optional(),
    BKASH_APP_SECRET: z.string().optional(),
    BKASH_SANDBOX: z.coerce.boolean().default(true),
  })
  .superRefine((env, ctx) => {
    // LLM_API_KEY is required unless we're running the in-memory stub provider.
    if (env.LLM_PROVIDER !== 'stub' && (!env.LLM_API_KEY || env.LLM_API_KEY.length === 0)) {
      ctx.addIssue({
        path: ['LLM_API_KEY'],
        code: z.ZodIssueCode.custom,
        message: `LLM_API_KEY is required when LLM_PROVIDER is "${env.LLM_PROVIDER}".`,
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Format + throw a clear startup error if env is invalid. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(
      `\n\n[jobab-backend] environment validation failed:\n${issues}\n\n` +
        `Fix .env and try again.\n`,
    );
  }
  return result.data;
}
