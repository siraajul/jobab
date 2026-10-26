import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, type Order } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BkashProvider, type BkashPayment } from './bkash.provider';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bkash: BkashProvider,
  ) {}

  async complete(paymentId: string, execute = false, organizationId?: string) {
    const order = await this.prisma.order.findFirst({
      where: { paymentId, ...(organizationId ? { organizationId } : {}) },
    });
    if (!order) throw new NotFoundException('Payment not found');
    if (order.paymentStatus === 'paid') return { ok: true, status: 'paid' };
    let payment = await this.bkash.query(paymentId);
    this.verify(order, payment);
    if (execute && payment.transactionStatus === 'Initiated') {
      // Execute timeouts are ambiguous: query again instead of blindly repeating a charge.
      try {
        await this.bkash.execute(paymentId);
      } catch {
        /* query is authoritative */
      }
      payment = await this.bkash.query(paymentId);
      this.verify(order, payment);
    }
    if (payment.transactionStatus !== 'Completed') return { ok: true, status: 'pending' };
    if (!payment.trxID) throw new BadRequestException('Payment has no transaction receipt');
    await this.prisma.order.updateMany({
      where: { id: order.id, paymentId, paymentStatus: 'pending' },
      data: { paymentStatus: 'paid', paymentTransactionId: payment.trxID },
    });
    return { ok: true, status: 'paid' };
  }

  private verify(order: Order, payment: BkashPayment) {
    let amountMatches = false;
    try {
      amountMatches = new Prisma.Decimal(payment.amount ?? 'NaN').equals(order.total);
    } catch {
      /* reject malformed amounts */
    }
    if (
      payment.paymentID !== order.paymentId ||
      payment.merchantInvoiceNumber !== order.id ||
      payment.currency !== order.currency ||
      !amountMatches
    ) {
      throw new BadRequestException('Payment receipt does not match the order');
    }
  }
}
