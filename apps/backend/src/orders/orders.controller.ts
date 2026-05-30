import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { SetOrderStatusBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import {
  ApiAuthCookie,
  ApiAuthErrors,
  ApiNotFound,
  ApiZodBody,
  ApiZodOk,
  ApiZodOkArray,
} from '../swagger/decorators';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiAuthCookie()
@ApiAuthErrors()
@Controller('orders')
export class OrdersController {
  constructor(private readonly svc: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List orders for the active org',
    description:
      'Filter by `conversationId` (all orders for that chat), or `status` / `payment` for ' +
      'the orders dashboard. With no filters returns the 200 most recent.',
  })
  @ApiQuery({
    name: 'conversationId',
    description: 'Scope to orders attached to this conversation.',
    required: false,
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter by lifecycle status.',
    required: false,
    enum: ['created', 'confirmed', 'shipped', 'delivered', 'cancelled'],
  })
  @ApiQuery({
    name: 'payment',
    description: 'Filter by payment status.',
    required: false,
    enum: ['pending', 'paid', 'failed'],
  })
  @ApiZodOkArray('OrderListItem', 'Matching orders, newest first.')
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
  @ApiOperation({
    summary: 'Get an order with its conversation context',
    description:
      'Includes the customer details, items, totals, and the conversation it was taken from.',
  })
  @ApiParam({ name: 'id', description: 'Order ID.', example: 'cm0order123' })
  @ApiZodOk('Order', 'Full order payload.')
  @ApiNotFound('Order')
  detail(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.detail(orgId, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: "Update an order's status",
    description:
      'Lifecycle: `created` → `confirmed` → `shipped` → `delivered`. `cancelled` from any. ' +
      'Optionally notifies the customer in the chat with a tracking note.',
  })
  @ApiParam({ name: 'id', description: 'Order ID.' })
  @ApiZodBody('SetOrderStatusBody', 'New status + optional customer notification.')
  @ApiZodOk('Order', 'The order at its new status.')
  @ApiNotFound('Order')
  setStatus(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const parsed = SetOrderStatusBodySchema.parse(body);
    return this.svc.updateStatus(orgId, id, parsed.status as OrderStatus, {
      notifyCustomer: parsed.notifyCustomer,
      trackingNote: parsed.trackingNote,
    });
  }

  @Post(':id/mark-paid')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Mark an order as paid (manual override)',
    description:
      'Use this when payment lands out-of-band — cash on delivery, manual bKash, etc. ' +
      'Sets `paymentStatus = paid` and timestamps `paidAt`.',
  })
  @ApiParam({ name: 'id', description: 'Order ID.' })
  @ApiZodOk('Order', 'The order, now marked paid.')
  @ApiNotFound('Order')
  markPaid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.markPaid(orgId, id);
  }
}
