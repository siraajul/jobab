import { EnvService } from '../../config/env.service';
import { EncryptionService } from './encryption.service';

function makeEnv(): EnvService {
  return {
    get: (k: string) => (k === 'ENCRYPTION_KEY' ? 'a'.repeat(32) : undefined),
  } as unknown as EnvService;
}

describe('EncryptionService', () => {
  const svc = new EncryptionService(makeEnv());

  it('round-trips a string', () => {
    const ct = svc.encrypt('page-access-token-EAA…');
    expect(ct).not.toContain('EAA…');
    expect(svc.decrypt(ct)).toBe('page-access-token-EAA…');
  });

  it('produces unique ciphertexts for the same plaintext (random IV)', () => {
    const a = svc.encrypt('same');
    const b = svc.encrypt('same');
    expect(a).not.toBe(b);
    expect(svc.decrypt(a)).toBe(svc.decrypt(b));
  });

  it('throws on tampered payload', () => {
    const ct = svc.encrypt('secret');
    const parts = ct.split(':');
    // flip a byte in the ciphertext
    parts[2] = (parts[2][0] === '0' ? '1' : '0') + parts[2].slice(1);
    expect(() => svc.decrypt(parts.join(':'))).toThrow();
  });
});
