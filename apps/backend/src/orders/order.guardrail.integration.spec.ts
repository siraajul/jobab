import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { OrderGuardrail } from './order.guardrail';
import { PrismaService } from '../prisma/prisma.service';
import { BkashProvider } from '../payments/bkash.provider';

// Explicit opt-in: use a disposable, migrated database, never the merchant database.
const databaseUrl = process.env.JOBAB_TEST_DATABASE_URL;
const describeDatabase = databaseUrl ? describe : describe.skip;

describeDatabase('OrderGuardrail concurrent reservations (Postgres)', () => {
  const db = new PrismaClient({
    datasources: databaseUrl ? { db: { url: databaseUrl } } : undefined,
  });
  const orgIds: string[] = [];
  const payment = {
    createLink: jest.fn(async () => ({ provider: 'bkash', link: 'https://payment.example/test' })),
  };
  const guardrail = new OrderGuardrail(db as PrismaService, payment as unknown as BkashProvider);

  async function fixture(stockQty: number) {
    const org = await db.organization.create({ data: { name: `concurrency-${randomUUID()}` } });
    orgIds.push(org.id);
    const page = await db.page.create({
      data: {
        organizationId: org.id,
        platform: 'facebook',
        externalPageId: randomUUID(),
        accessToken: 'test-only',
      },
    });
    const product = await db.product.create({
      data: {
        organizationId: org.id,
        title: 'Test product',
        price: 100,
        variants: { create: { name: 'Test variant', price: 100, stockQty } },
      },
      include: { variants: true },
    });
    const conversations = await Promise.all(
      [0, 1].map(() =>
        db.conversation.create({
          data: {
            organizationId: org.id,
            pageId: page.id,
            externalUserId: randomUUID(),
            customerName: 'Test',
            customerPhone: '01700000000',
            customerAddress: 'Test address',
          },
        }),
      ),
    );
    const input = (index: number) => ({
      organizationId: org.id,
      conversationId: conversations[index].id,
      proposedItems: [{ product_id: product.id, variant_id: product.variants[0].id, qty: 1 }],
    });
    return { org, variant: product.variants[0], input };
  }

  afterEach(async () => {
    await db.organization.deleteMany({ where: { id: { in: orgIds.splice(0) } } });
    payment.createLink.mockClear();
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('allows only one buyer to reserve the last unit', async () => {
    const { org, variant, input } = await fixture(1);
    const results = await Promise.all([
      guardrail.tryCreate(input(0)),
      guardrail.tryCreate(input(1)),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results).toContainEqual({
      ok: false,
      error: 'out_of_stock',
      offending_variant_ids: [variant.id],
    });
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockQty,
    ).toBe(0);
    expect(await db.order.count({ where: { organizationId: org.id } })).toBe(1);
    expect(payment.createLink).toHaveBeenCalledTimes(1);
  });

  it('creates one active order for concurrent requests on the same conversation', async () => {
    const { org, variant, input } = await fixture(10);
    const second = await db.productVariant.create({
      data: {
        productId: variant.productId,
        name: 'Other',
        price: 100,
        stockQty: 10,
      },
    });
    const otherInput = {
      ...input(0),
      proposedItems: [{ product_id: variant.productId, variant_id: second.id, qty: 1 }],
    };
    const results = await Promise.all([
      guardrail.tryCreate(input(0)),
      guardrail.tryCreate(otherInput),
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.find((result) => !result.ok)).toMatchObject({
      ok: false,
      error: 'duplicate_order',
    });
    expect(await db.order.count({ where: { organizationId: org.id } })).toBe(1);
    const remaining = await db.productVariant.aggregate({
      where: { id: { in: [variant.id, second.id] } },
      _sum: { stockQty: true },
    });
    expect(remaining._sum.stockQty).toBe(19);
    // A later job retry must also be harmless.
    await expect(guardrail.tryCreate(input(0))).resolves.toMatchObject({
      error: 'duplicate_order',
    });
    expect(payment.createLink).toHaveBeenCalledTimes(1);
  });

  it('rolls back the order and earlier stock changes if a later update fails', async () => {
    const { org, variant, input } = await fixture(5);
    const second = await db.productVariant.create({
      data: {
        productId: variant.productId,
        name: 'Second',
        price: 50,
        stockQty: 5,
      },
    });
    const failingDb = db.$extends({
      query: {
        productVariant: {
          async update({ args, query }) {
            if (args.where.id === second.id) throw new Error('injected inventory failure');
            return query(args);
          },
        },
      },
    });
    const failingGuardrail = new OrderGuardrail(
      failingDb as unknown as PrismaService,
      payment as unknown as BkashProvider,
    );
    await expect(
      failingGuardrail.tryCreate({
        ...input(0),
        proposedItems: [
          ...input(0).proposedItems,
          { product_id: variant.productId, variant_id: second.id, qty: 1 },
        ],
      }),
    ).rejects.toThrow('injected inventory failure');
    expect(await db.order.count({ where: { organizationId: org.id } })).toBe(0);
    expect(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variant.id } })).stockQty,
    ).toBe(5);
    expect(payment.createLink).not.toHaveBeenCalled();
  });
});
