import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrgId } from '../auth/auth.guard';
import { ApiAuthCookie, ApiAuthErrors, ApiZodOk } from '../swagger/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Dashboard analytics for the last N days',
    description:
      'Aggregated counters for the Analytics page — AI conversations, revenue, token spend, ' +
      'mean latency, cost. Window defaults to 7 days; clamp 1-90.',
  })
  @ApiQuery({
    name: 'days',
    description: 'Look-back window in days. Clamped to 1-90.',
    required: false,
    example: 7,
  })
  @ApiZodOk('AnalyticsSummary', 'Aggregated counters.')
  summary(@OrgId() orgId: string, @Query('days') days?: string) {
    return this.svc.summary(orgId, days ? Math.max(1, Math.min(90, Number(days))) : 7);
  }
}
