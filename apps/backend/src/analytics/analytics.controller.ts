import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrgId } from '../auth/auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Org-wide analytics summary over the last N days (default 7)' })
  summary(@OrgId() orgId: string, @Query('days') days?: string) {
    return this.svc.summary(orgId, days ? Math.max(1, Math.min(90, Number(days))) : 7);
  }
}
