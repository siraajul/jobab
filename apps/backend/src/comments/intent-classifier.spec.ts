import { IntentClassifier } from './intent-classifier';
import type { EnvService } from '../config/env.service';

const fakeEnv: EnvService = {
  get: () => undefined,
} as unknown as EnvService;

describe('IntentClassifier.quickHeuristic', () => {
  const c = new IntentClassifier(fakeEnv);

  it('classifies obvious price tokens without an API call', async () => {
    const r = await c.classify('koto?');
    expect(r.intent).toBe('price');
    expect(r.confidence).toBeGreaterThan(0.8);
  });

  it("classifies Bangla 'দাম কত?' as price", async () => {
    const r = await c.classify('দাম কত?');
    expect(r.intent).toBe('price');
  });

  it('classifies emoji-only as other', async () => {
    const r = await c.classify('❤️❤️🌸');
    expect(r.intent).toBe('other');
  });

  it('routes empty text to other', async () => {
    const r = await c.classify('   ');
    expect(r.intent).toBe('other');
  });
});
