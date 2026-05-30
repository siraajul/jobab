import { validateEnv } from './env.schema';

const minimal = {
  DATABASE_URL: 'postgresql://u:p@h:5432/d',
  REDIS_URL: 'redis://localhost:6379',
  META_APP_SECRET: 's',
  META_VERIFY_TOKEN: 't',
  LLM_API_KEY: 'k',
  ENCRYPTION_KEY: 'a'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a minimal valid env', () => {
    const env = validateEnv(minimal);
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.LLM_PROVIDER).toBe('groq');
    expect(env.MESSENGER_DRY_RUN).toBe(true);
  });

  it('coerces string-numeric PORT', () => {
    expect(validateEnv({ ...minimal, PORT: '4000' }).PORT).toBe(4000);
  });

  it('throws on missing critical key', () => {
    const { LLM_API_KEY: _, ...rest } = minimal;
    expect(() => validateEnv(rest)).toThrow(/LLM_API_KEY/);
  });

  it('throws on short encryption key', () => {
    expect(() => validateEnv({ ...minimal, ENCRYPTION_KEY: 'short' })).toThrow(/ENCRYPTION_KEY/);
  });

  it('accepts LLM_PROVIDER=stub without LLM_API_KEY', () => {
    const { LLM_API_KEY: _, ...rest } = minimal;
    const env = validateEnv({ ...rest, LLM_PROVIDER: 'stub' });
    expect(env.LLM_PROVIDER).toBe('stub');
    expect(env.LLM_API_KEY).toBeUndefined();
  });
});
