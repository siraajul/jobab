import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BkashProvider } from '../payments/bkash.provider';

/**
 * Order guardrail (spec §6).
 *
 * The LLM proposes line items; this code decides if an order can be made.
 *  1. All required customer fields present.
 *  2. Every variant re-checked against live stock (no trusting earlier chat).
 *  3. Total recomputed from current variant prices (no trusting model prices).
 * Any failure returns a structured error the agent can act on — never a
 * partial order.
 */

export interface ProposedItem {
  product_id: string;
  variant_id: string;
  qty: number;
}

export interface CreateOrderInput {
  organizationId: string;
  conversationId: string;
  proposedItems: ProposedItem[];
}

export type CreateOrderResult =
  | {
      ok: true;
      order_id: string;
      total: number;
      currency: string;
      payment_link?: string;
    }
  | {
      ok: false;
      error:
        | 'missing_customer_fields'
        | 'unknown_variant'
        | 'out_of_stock'
        | 'no_items'
        | 'duplicate_order';
      missing_fields?: Array<'name' | 'phone' | 'address'>;
      offending_variant_ids?: string[];
      existing_order_id?: string;
    };

@Injectable()
export class OrderGuardrail {
  private readonly log = new Logger(OrderGuardrail.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly bkash: BkashProvider,
  ) {}

  async tryCreate(input: CreateOrderInput): Promise<CreateOrderResult> {
    if (input.proposedItems.length === 0) return { ok: false, error: 'no_items' };

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { id: input.conversationId, organizationId: input.organizationId },
    });

    // 0. One active order per conversation. The model can ask the merchant to
    //    open a new conversation if the customer wants a second order.
    const existing = await this.prisma.order.findFirst({
      where: {
        conversationId: input.conversationId,
        status: { in: ['created', 'confirmed'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return { ok: false, error: 'duplicate_order', existing_order_id: existing.id };
    }

    // 1. Required customer fields.
    const missing: Array<'name' | 'phone' | 'address'> = [];
    if (!conversation.customerName?.trim()) missing.push('name');
    if (!conversation.customerPhone?.trim()) missing.push('phone');
    if (!conversation.customerAddress?.trim()) missing.push('address');
    if (missing.length > 0) {
      return { ok: false, error: 'missing_customer_fields', missing_fields: missing };
    }

    // 2. + 3. Live stock + price recomputation in one DB read.
    const variantIds = input.proposedItems.map((i) => i.variant_id);
    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: variantIds },
        product: { organizationId: input.organizationId },
      },
      include: { product: true },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const unknown = input.proposedItems
      .filter((i) => !variantMap.has(i.variant_id))
      .map((i) => i.variant_id);
    if (unknown.length > 0) {
      return { ok: false, error: 'unknown_variant', offending_variant_ids: unknown };
    }

    const oos = input.proposedItems.filter((i) => {
      const v = variantMap.get(i.variant_id)!;
      return v.stockQty < i.qty;
    });
    if (oos.length > 0) {
      return {
        ok: false,
        error: 'out_of_stock',
        offending_variant_ids: oos.map((i) => i.variant_id),
      };
    }

    // Build canonical items snapshot with live prices.
    const items = input.proposedItems.map((i) => {
      const v = variantMap.get(i.variant_id)!;
      return {
        product_id: v.productId,
        variant_id: v.id,
        qty: i.qty,
        price: Number(v.price),
      };
    });
    const total = items.reduce((acc, it) => acc + it.price * it.qty, 0);
    const currency = variants[0].product.currency;

    // 4. Persist; decrement stock atomically.
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          organizationId: input.organizationId,
          conversationId: input.conversationId,
          items: items as unknown as Prisma.InputJsonValue,
          customerName: conversation.customerName!,
          customerPhone: conversation.customerPhone!,
          customerAddress: conversation.customerAddress!,
          total,
          currency,
        },
      });
      for (const it of items) {
        await tx.productVariant.update({
          where: { id: it.variant_id },
          data: { stockQty: { decrement: it.qty } },
        });
      }
      return created;
    });

    // Payment link — bKash by default; failures degrade to "order created
    // without a link" rather than rolling back the order itself.
    let paymentLink: string | undefined;
    try {
      const link = await this.bkash.createLink({
        orderId: order.id,
        amount: total,
        currency,
        customer: { name: conversation.customerName!, phone: conversation.customerPhone! },
      });
      paymentLink = link.link;
      await this.prisma.order.update({
        where: { id: order.id },
        data: { paymentLink: link.link },
      });
    } catch (err) {
      this.log.warn(`payment link generation failed for ${order.id}: ${(err as Error).message}`);
    }

    // TODO: push to Shopify/Woo (§8).
    return {
      ok: true,
      order_id: order.id,
      total: Number(order.total),
      currency: order.currency,
      payment_link: paymentLink,
    };
  }
}
