import { EnvService } from '../config/env.service';
import { SessionService } from './session.service';

function makeEnv(): EnvService {
  return {
    get: (k: string) => (k === 'ENCRYPTION_KEY' ? 'k'.repeat(32) : undefined),
  } as unknown as EnvService;
}

describe('SessionService', () => {
  const svc = new SessionService(makeEnv());

  it('round-trips a session', () => {
    const { value } = svc.sign('user_123');
    const payload = svc.verify(value);
    expect(payload).not.toBeNull();
    expect(payload?.uid).toBe('user_123');
  });

  it('rejects a tampered payload', () => {
    const { value } = svc.sign('user_123');
    const tampered = value.replace(/^./, 'A');
    expect(svc.verify(tampered)).toBeNull();
  });

  it('rejects an expired payload', () => {
    const orig = Date.now;
    Date.now = () => orig() - 60 * 60 * 24 * 365 * 1000; // a year ago
    const { value } = svc.sign('user_old');
    Date.now = orig;
    expect(svc.verify(value)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(svc.verify(undefined)).toBeNull();
    expect(svc.verify('garbage')).toBeNull();
    expect(svc.verify('no.dots')).toBeNull();
  });

  it('hashes invite tokens deterministically (same input → same hash)', () => {
    const a = svc.hashInviteToken('tok_x');
    const b = svc.hashInviteToken('tok_x');
    expect(a).toBe(b);
    expect(a).not.toBe(svc.hashInviteToken('tok_y'));
  });
});
