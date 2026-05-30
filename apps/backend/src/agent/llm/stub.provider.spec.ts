import { ConfigService } from '@nestjs/config';
import { StubLlmProvider } from './stub.provider';

function makeProvider(env: Record<string, string | undefined> = {}) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new StubLlmProvider(config);
}

const callOpts = {
  model: 'stub',
  messages: [{ role: 'user' as const, content: 'hi' }],
  tools: [],
};

describe('StubLlmProvider', () => {
  it('returns the default text reply when no script is set', async () => {
    const provider = makeProvider();
    const result = await provider.call(callOpts);
    expect(result.text).toMatch(/stub reply/i);
    expect(result.toolCalls).toEqual([]);
    expect(result.inputTokens).toBe(0);
    expect(result.costUsd).toBe(0);
  });

  it('walks through a scripted sequence and falls back when exhausted', async () => {
    const script = JSON.stringify([
      { text: 'first' },
      { toolCalls: [{ name: 'search_catalog', arguments: { query: 'saree' } }] },
      { text: 'third' },
    ]);
    const provider = makeProvider({ LLM_STUB_REPLIES: script });

    const r1 = await provider.call(callOpts);
    expect(r1.text).toBe('first');

    const r2 = await provider.call(callOpts);
    expect(r2.text).toBeUndefined();
    expect(r2.toolCalls).toHaveLength(1);
    expect(r2.toolCalls[0].name).toBe('search_catalog');
    expect(r2.toolCalls[0].arguments).toEqual({ query: 'saree' });

    const r3 = await provider.call(callOpts);
    expect(r3.text).toBe('third');

    // Exhausted — falls back to the default reply.
    const r4 = await provider.call(callOpts);
    expect(r4.text).toMatch(/stub reply/i);
  });

  it('ignores malformed JSON in LLM_STUB_REPLIES', async () => {
    const provider = makeProvider({ LLM_STUB_REPLIES: 'not json' });
    const result = await provider.call(callOpts);
    expect(result.text).toMatch(/stub reply/i);
  });
});
