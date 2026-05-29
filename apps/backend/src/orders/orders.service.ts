import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerService } from '../messenger/messenger.service';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messenger: MessengerService,
  ) {}

  list(
    organizationId: string,
    filters: { status?: OrderStatus; payment?: PaymentStatus } = {},
  ) {
    return this.prisma.order.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.payment ? { paymentStatus: filters.payment } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        conversation: {
          select: { id: true, externalUserId: true, customerName: true },
        },
      },
    });
  }

  async detail(organizationId: string, id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, organizationId },
      include: {
        conversation: {
          select: { id: true, externalUserId: true, customerName: true, status: true },
        },
      },
    });
    if (!order) throw new NotFoundException();
    return order;
  }

  byConversation(organizationId: string, conversationId: string) {
    return this.prisma.order.findFirst({
      where: { organizationId, conversationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    organizationId: string,
    id: string,
    status: OrderStatus,
    opts: { notifyCustomer?: boolean; trackingNote?: string } = {},
  ) {
    await this.requireOwn(organizationId, id);
    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: { conversation: true },
    });

    // Customer-facing tracking message — optional, gated by the merchant.
    if (opts.notifyCustomer && (status === 'shipped' || status === 'delivered')) {
      const body =
        status === 'shipped'
          ? `Apa, apnar order #${id.slice(-6).toUpperCase()} dispatch hoiche 📦. ${
              opts.trackingNote ?? 'Delivery 2-3 din e poucabe.'
            }`
          : `Apa, apnar order #${id.slice(-6).toUpperCase()} delivered hoiche 🎉. Dhonnobad! Kemon legechilo bolben?`;
      await this.messenger
        .sendText(updated.conversationId, body)
        .catch(() => undefined);
    }
    return updated;
  }

  async markPaid(organizationId: string, id: string) {
    await this.requireOwn(organizationId, id);
    return this.prisma.order.update({
      where: { id },
      data: { paymentStatus: 'paid' },
    });
  }

  private async requireOwn(organizationId: string, id: string) {
    const c = await this.prisma.order.count({ where: { id, organizationId } });
    if (!c) throw new NotFoundException();
  }
}
