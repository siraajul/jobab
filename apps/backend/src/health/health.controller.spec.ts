/**
 * Smoke test for the cheap liveness endpoint. Readiness depends on Prisma,
 * which an integration test (in test:e2e) would cover.
 */
import { HealthController } from './health.controller';

describe('HealthController', () => {
  const ctrl = new HealthController({} as never, {} as never, {} as never);

  it('liveness reports uptime', () => {
    const out = ctrl.liveness();
    expect(out.ok).toBe(true);
    expect(typeof out.uptime).toBe('number');
  });
});
