import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Strongly-typed accessor for the validated env. Use instead of
 * `ConfigService.get<string>(...)` so misspellings fail at compile time.
 */
@Injectable()
export class EnvService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  get<K extends keyof Env>(key: K): Env[K] {
    return this.config.get<Env[K]>(key as string) as Env[K];
  }
}
