import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
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

  /** Cheap liveness — does the process answer? */
  @Get('healthz')
  liveness() {
    return { ok: true, uptime: process.uptime() };
  }

  /** Real readiness — DB reachable, migrations applied. */
  @Get('readyz')
  @HealthCheck()
  readiness() {
    return this.health.check([() => this.db.pingCheck('postgres', this.prisma)]);
  }
}
