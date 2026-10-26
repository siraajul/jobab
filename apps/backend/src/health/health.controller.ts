import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
  HealthCheckError,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiInlineOk } from '../swagger/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { AgentQueueService } from '../queue/agent-queue.service';
import { Public } from '../auth/auth.guard';

@Public()
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly queue: AgentQueueService,
  ) {}

  @Get('healthz')
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Cheap check that the process is up and accepting requests. Does **not** verify ' +
      'database connectivity — use `/readyz` for that. Public; safe to expose to load balancers.',
  })
  @ApiInlineOk('Process is alive.', { ok: true, uptime: 12345.6 })
  liveness() {
    return { ok: true, uptime: process.uptime() };
  }

  @Get('readyz')
  @HealthCheck()
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Verifies the database is reachable and migrations are applied. Use this gate to ' +
      'decide when to send traffic to a new pod. Returns 503 if any dependency is unhealthy.',
  })
  @ApiInlineOk('All dependencies healthy.', {
    status: 'ok',
    info: { postgres: { status: 'up' } },
    error: {},
    details: { postgres: { status: 'up' } },
  })
  readiness() {
    return this.health.check([
      () => this.db.pingCheck('postgres', this.prisma),
      async () => {
        const expected = readdirSync(resolve(__dirname, '../../prisma/migrations'), {
          withFileTypes: true,
        })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
        const applied = await this.prisma.$queryRaw<
          Array<{ migration_name: string }>
        >`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
        if (expected.some((name) => !applied.some((row) => row.migration_name === name)))
          throw new HealthCheckError('Migrations pending', { migrations: { status: 'down' } });
        return { migrations: { status: 'up' } };
      },
      async () => {
        try {
          if (await this.queue.health()) return { redis: { status: 'up' } };
        } catch {
          /* report unhealthy */
        }
        throw new HealthCheckError('Redis unavailable', { redis: { status: 'down' } });
      },
    ]);
  }
}
