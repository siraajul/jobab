import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { EnvService } from '../../config/env.service';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const SALT = Buffer.from('jobab-static-salt');
const KEY_LEN = 32;

/**
 * AES-256-GCM encryption for tokens at rest (page access tokens, catalog
 * credentials). Key is derived once from ENCRYPTION_KEY via scrypt so even
 * a string-typed env var becomes a proper symmetric key.
 *
 * Serialised format: `<iv:hex>:<tag:hex>:<ciphertext:hex>`.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(env: EnvService) {
    this.key = scryptSync(env.get('ENCRYPTION_KEY'), SALT, KEY_LEN);
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LEN);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`;
  }

  decrypt(serialized: string): string {
    const [ivHex, tagHex, ctHex] = serialized.split(':');
    if (!ivHex || !tagHex || !ctHex) {
      throw new Error('encryption: malformed payload');
    }
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = createDecipheriv(ALGO, this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  }
}
