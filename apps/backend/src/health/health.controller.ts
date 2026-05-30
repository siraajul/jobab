import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiInlineOk } from '../swagger/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/auth.guard';

@Public()
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
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
    return this.health.check([() => this.db.pingCheck('postgres', this.prisma)]);
  }
}
