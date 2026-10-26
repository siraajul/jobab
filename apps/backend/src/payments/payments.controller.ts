import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { OrgId, Public, Roles } from '../auth/auth.guard';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments/bkash')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Get('callback')
  @ApiOperation({ summary: 'Verify the provider receipt before marking an order paid' })
  callback(@Query() query: unknown) {
    const input = z
      .object({
        paymentID: z.string().min(1).max(200),
        status: z.enum(['success', 'failure', 'cancel']),
      })
      .parse(query);
    return this.payments.complete(input.paymentID, input.status === 'success');
  }

  @Post(':paymentId/reconcile')
  @Roles('owner', 'admin')
  @ApiOperation({
    summary: 'Reconcile a pending payment against the provider; scoped to this merchant',
  })
  reconcile(@OrgId() organizationId: string, @Param('paymentId') paymentId: string) {
    return this.payments.complete(paymentId, false, organizationId);
  }
}
