import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BkashProvider } from './bkash.provider';

describe('Payment receipt verification', () => {
  function fixture(over: Record<string, unknown> = {}) {
    const order = {
      id: 'order1',
      paymentId: 'pay1',
      total: new Prisma.Decimal(100),
      currency: 'BDT',
      paymentStatus: 'pending',
    };
    const receipt = {
      paymentID: 'pay1',
      merchantInvoiceNumber: 'order1',
      amount: '100.00',
      currency: 'BDT',
      transactionStatus: 'Completed',
      trxID: 'trx1',
      ...over,
    };
    const db = {
      order: {
        findFirst: jest.fn(async () => order),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    const provider = { query: jest.fn(async () => receipt), execute: jest.fn(async () => receipt) };
    return {
      db,
      provider,
      service: new PaymentsService(
        db as unknown as PrismaService,
        provider as unknown as BkashProvider,
      ),
    };
  }
  it.each([
    { amount: '1.00' },
    { currency: 'USD' },
    { paymentID: 'other' },
    { merchantInvoiceNumber: 'other' },
    { trxID: undefined },
  ])('rejects a mismatched receipt %p', async (value) => {
    const { service, db } = fixture(value);
    await expect(service.complete('pay1', true)).rejects.toThrow();
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it('only marks a completed, matching receipt paid', async () => {
    const { service, db } = fixture();
    await expect(service.complete('pay1')).resolves.toEqual({ ok: true, status: 'paid' });
    expect(db.order.updateMany).toHaveBeenCalledWith({
      where: { id: 'order1', paymentId: 'pay1', paymentStatus: 'pending' },
      data: { paymentStatus: 'paid', paymentTransactionId: 'trx1' },
    });
  });
  it('does not trust a success callback when the provider still reports pending', async () => {
    const { service, db } = fixture({ transactionStatus: 'Initiated' });
    await expect(service.complete('pay1', true)).resolves.toEqual({ ok: true, status: 'pending' });
    expect(db.order.updateMany).not.toHaveBeenCalled();
  });
  it('scopes reconciliation to the authenticated merchant', async () => {
    const { service, db } = fixture();
    await service.complete('pay1', false, 'org1');
    expect(db.order.findFirst).toHaveBeenCalledWith({
      where: { paymentId: 'pay1', organizationId: 'org1' },
    });
  });
});
