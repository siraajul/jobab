import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { SetOrderStatusBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders (optionally scoped to a conversation/status/payment)' })
  list(
    @OrgId() orgId: string,
    @Query('conversationId') conversationId?: string,
    @Query('status') status?: OrderStatus,
    @Query('payment') payment?: PaymentStatus,
  ) {
    if (conversationId) return this.svc.byConversation(orgId, conversationId);
    return this.svc.list(orgId, { status, payment });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an order with its conversation context' })
  detail(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.detail(orgId, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (optionally notify the customer)' })
  setStatus(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const parsed = SetOrderStatusBodySchema.parse(body);
    return this.svc.updateStatus(orgId, id, parsed.status as OrderStatus, {
      notifyCustomer: parsed.notifyCustomer,
      trackingNote: parsed.trackingNote,
    });
  }

  @Post(':id/mark-paid')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark order as paid' })
  markPaid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.markPaid(orgId, id);
  }
}
