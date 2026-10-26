import { Injectable, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { EnvService } from '../config/env.service';

@Injectable()
export class AgentRuntimeService implements OnModuleDestroy {
  private readonly redis: Redis;
  constructor(private readonly env: EnvService) {
    this.redis = new Redis(env.get('REDIS_URL'), { maxRetriesPerRequest: 1, lazyConnect: true });
    this.redis.on('error', () => undefined); // callers fail closed; do not log URLs or credentials
  }

  async reserveTokens(organizationId: string, amount: number) {
    const key = `jobab:tokens:${organizationId}:${new Date().toISOString().slice(0, 10)}`;
    const allowed = await this.redis.eval(
      `
      local used = tonumber(redis.call('GET', KEYS[1]) or '0')
      if used + tonumber(ARGV[1]) > tonumber(ARGV[2]) then return 0 end
      redis.call('INCRBY', KEYS[1], ARGV[1]); redis.call('EXPIRE', KEYS[1], 172800); return 1
    `,
      1,
      key,
      amount,
      this.env.get('AI_DAILY_TOKEN_LIMIT'),
    );
    if (allowed !== 1)
      throw new ServiceUnavailableException('Merchant daily AI token allowance exhausted');
  }

  async runExclusive<T>(conversationId: string, run: () => Promise<T>): Promise<T> {
    const key = `jobab:processing:${conversationId}`;
    const owner = randomUUID();
    if ((await this.redis.set(key, owner, 'PX', 180_000, 'NX')) !== 'OK') {
      throw new Error('conversation already processing; retry later');
    }
    const refresh = setInterval(() => {
      void this.redis
        .eval(
          `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('PEXPIRE', KEYS[1], 180000) end return 0`,
          1,
          key,
          owner,
        )
        .catch(() => undefined);
    }, 30_000);
    refresh.unref();
    try {
      return await run();
    } finally {
      clearInterval(refresh);
      await this.redis.eval(
        `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`,
        1,
        key,
        owner,
      );
    }
  }

  async onModuleDestroy() {
    this.redis.disconnect();
  }
}
