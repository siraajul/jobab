import { OrderGuardrail, CreateOrderResult } from './order.guardrail';

/**
 * Unit tests for the guardrail logic — exercised against an in-memory fake
 * PrismaService. The DB-touching behavior (transaction, decrement) is left
 * for an integration test.
 */

type Conversation = {
  id: string;
  organizationId: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
};

type Variant = {
  id: string;
  productId: string;
  price: number;
  stockQty: number;
  product: { organizationId: string; currency: string };
};

function makePrisma(opts: { conv: Conversation; variants: Variant[]; existingOrder?: { id: string } | null }) {
  const orders: any[] = [];
  return {
    conversation: {
      findFirstOrThrow: async ({ where }: any) => {
        if (where.id !== opts.conv.id) throw new Error('not found');
        return opts.conv as any;
      },
    },
    order: {
      findFirst: async () => opts.existingOrder ?? null,
      update: async () => undefined,
    },
    productVariant: {
      findMany: async ({ where }: any) =>
        opts.variants.filter(
          (v) =>
            (where.id.in as string[]).includes(v.id) &&
            v.product.organizationId === where.product.organizationId,
        ) as any,
    },
    $transaction: async (fn: any) => {
      const tx = {
        order: {
          create: async ({ data }: any) => {
            const o = { ...data, id: 'order_test', total: data.total };
            orders.push(o);
            return o;
          },
        },
        productVariant: { update: async () => undefined },
      };
      return fn(tx);
    },
    _orders: orders,
  } as any;
}

const fakeBkash = {
  name: 'bkash',
  createLink: async () => ({ provider: 'bkash', link: 'https://dev/pay/x' }),
} as any;

describe('OrderGuardrail', () => {
  const conv: Conversation = {
    id: 'c1',
    organizationId: 'org1',
    customerName: 'Tahmina',
    customerPhone: '01713-000000',
    customerAddress: 'Dhanmondi, Dhaka',
  };
  const variant: Variant = {
    id: 'v1',
    productId: 'p1',
    price: 1650,
    stockQty: 3,
    product: { organizationId: 'org1', currency: 'BDT' },
  };

  it('rejects when required customer fields are missing', async () => {
    const prisma = makePrisma({
      conv: { ...conv, customerAddress: null },
      variants: [variant],
    });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = (await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p1', variant_id: 'v1', qty: 1 }],
    })) as Extract<CreateOrderResult, { ok: false }>;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('missing_customer_fields');
    expect(r.missing_fields).toEqual(['address']);
  });

  it('rejects empty items', async () => {
    const prisma = makePrisma({ conv, variants: [variant] });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [],
    });
    expect(r).toEqual({ ok: false, error: 'no_items' });
  });

  it('rejects when stock is insufficient', async () => {
    const prisma = makePrisma({ conv, variants: [{ ...variant, stockQty: 0 }] });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = (await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p1', variant_id: 'v1', qty: 1 }],
    })) as Extract<CreateOrderResult, { ok: false }>;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('out_of_stock');
  });

  it('rejects unknown variant', async () => {
    const prisma = makePrisma({ conv, variants: [variant] });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = (await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p1', variant_id: 'v_unknown', qty: 1 }],
    })) as Extract<CreateOrderResult, { ok: false }>;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('unknown_variant');
  });

  it('rejects when an active order already exists on the conversation', async () => {
    const prisma = makePrisma({
      conv,
      variants: [variant],
      existingOrder: { id: 'existing-order-id' },
    });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = (await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p1', variant_id: 'v1', qty: 1 }],
    })) as Extract<CreateOrderResult, { ok: false }>;
    expect(r.ok).toBe(false);
    expect(r.error).toBe('duplicate_order');
    expect(r.existing_order_id).toBe('existing-order-id');
  });

  it('creates the order and recomputes total from live prices', async () => {
    const prisma = makePrisma({ conv, variants: [variant] });
    const g = new OrderGuardrail(prisma, fakeBkash);
    const r = (await g.tryCreate({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p1', variant_id: 'v1', qty: 2 }],
    })) as Extract<CreateOrderResult, { ok: true }>;
    expect(r.ok).toBe(true);
    expect(r.total).toBe(3300);
    expect(r.currency).toBe('BDT');
    expect(prisma._orders).toHaveLength(1);
    expect(prisma._orders[0].items).toEqual([
      { product_id: 'p1', variant_id: 'v1', qty: 2, price: 1650 },
    ]);
  });
});
