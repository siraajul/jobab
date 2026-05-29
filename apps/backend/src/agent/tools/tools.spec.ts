import { searchCatalogTool } from './search-catalog.tool';
import { checkStockTool } from './check-stock.tool';
import { saveCustomerDetailTool } from './save-customer-detail.tool';
import { createOrderTool } from './create-order.tool';
import { handoffToHumanTool } from './handoff-to-human.tool';
import type { ToolContext } from './types';

function ctx(over: Partial<ToolContext> = {}): ToolContext {
  return {
    organizationId: 'org1',
    conversationId: 'c1',
    prisma: {} as never,
    catalog: { search: jest.fn(async () => [{ product_id: 'p', title: 't', price: 1, currency: 'BDT', variants: [] }]) } as never,
    guardrail: { tryCreate: jest.fn(async () => ({ ok: true, order_id: 'o1', total: 100, currency: 'BDT' })) } as never,
    vision: {} as never,
    embeddings: { available: false } as never,
    whatsapp: { notifyOrg: jest.fn(async () => undefined) } as never,
    ...over,
  };
}

describe('search_catalog tool', () => {
  it('rejects empty queries via zod', async () => {
    await expect(searchCatalogTool.execute({ query: '' }, ctx())).rejects.toThrow();
  });
  it('delegates to catalog.search', async () => {
    const c = ctx();
    await searchCatalogTool.execute({ query: 'shari' }, c);
    expect(c.catalog.search).toHaveBeenCalledWith('org1', 'shari', 5);
  });
});

describe('check_stock tool', () => {
  it('returns unknown_variant when missing', async () => {
    const c = ctx({
      prisma: { productVariant: { findFirst: async () => null } } as never,
    });
    const r = await checkStockTool.execute({ product_id: 'p', variant_id: 'v' }, c);
    expect(r).toMatchObject({ error: 'unknown_variant' });
  });
  it('returns stock + price for a known variant', async () => {
    const c = ctx({
      prisma: {
        productVariant: {
          findFirst: async () => ({ id: 'v', productId: 'p', stockQty: 3, price: 1650 }),
        },
      } as never,
    });
    const r = (await checkStockTool.execute({ product_id: 'p', variant_id: 'v' }, c)) as Record<
      string,
      unknown
    >;
    expect(r).toEqual({ in_stock: true, stock_qty: 3, price: 1650 });
  });
});

describe('save_customer_detail tool', () => {
  const baseConv = { id: 'c1', organizationId: 'org1' };
  const messages = (texts: string[]) =>
    ({
      message: {
        findMany: async () => texts.map((t) => ({ content: t })),
      },
      conversation: { update: jest.fn(async () => baseConv) },
    } as never);

  it('blocks ungrounded values', async () => {
    const prisma = messages(['just chatting about weather']);
    const r = await saveCustomerDetailTool.execute(
      { field: 'address', value: 'House 14, Banani, Dhaka' },
      ctx({ prisma }),
    );
    expect(r).toMatchObject({ ok: false, error: 'not_grounded_in_conversation' });
  });

  it('accepts when value appears in a recent customer message', async () => {
    const prisma = messages(['my address is House 14, Banani, Dhaka, please']);
    const r = await saveCustomerDetailTool.execute(
      { field: 'address', value: 'House 14, Banani, Dhaka' },
      ctx({ prisma }),
    );
    expect(r).toEqual({ ok: true });
  });

  it('handles light reformatting in the grounding check', async () => {
    const prisma = messages(['01713-456789']);
    const r = await saveCustomerDetailTool.execute(
      { field: 'phone', value: '01713 456789' },
      ctx({ prisma }),
    );
    expect(r).toEqual({ ok: true });
  });
});

describe('handoff_to_human tool', () => {
  it('flips status to needs_human and notifies the merchant', async () => {
    const updates: Array<unknown> = [];
    const whatsapp = { notifyOrg: jest.fn(async () => undefined) };
    const c = ctx({
      prisma: {
        conversation: {
          update: async (args: unknown) => {
            updates.push(args);
            return { id: 'c1', customerName: 'Tahmina', externalUserId: 'fb_tahmina' };
          },
        },
      } as never,
      whatsapp: whatsapp as never,
    });
    const r = await handoffToHumanTool.execute(
      { category: 'complaint', reason: 'damaged item' },
      c,
    );
    expect(r).toMatchObject({ ok: true, category: 'complaint', reason: 'damaged item' });
    expect(updates).toHaveLength(1);
    // The category + reason are persisted on the conversation for triage.
    expect(updates[0]).toMatchObject({
      data: { status: 'needs_human', handoffCategory: 'complaint', handoffReason: 'damaged item' },
    });
    expect(whatsapp.notifyOrg).toHaveBeenCalledTimes(1);
    const [, message] = whatsapp.notifyOrg.mock.calls[0] as unknown as [string, string];
    expect(message).toMatch(/Tahmina/);
  });
});

describe('create_order tool', () => {
  it('delegates to guardrail', async () => {
    const c = ctx();
    await createOrderTool.execute(
      { items: [{ product_id: 'p', variant_id: 'v', qty: 1 }] },
      c,
    );
    expect(c.guardrail.tryCreate).toHaveBeenCalledWith({
      organizationId: 'org1',
      conversationId: 'c1',
      proposedItems: [{ product_id: 'p', variant_id: 'v', qty: 1 }],
    });
  });
});
