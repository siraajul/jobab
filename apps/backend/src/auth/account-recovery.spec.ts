import { AccountRecoveryService } from './account-recovery.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from './mail.service';

describe('Account recovery', () => {
  function fixture(valid = true) {
    const tx = {
      passwordResetToken: {
        findUnique: jest.fn(async () => ({ id: 'reset', userId: 'user' })),
        updateMany: jest.fn(async () => ({ count: valid ? 1 : 0 })),
      },
      user: { update: jest.fn(async () => ({})) },
    };
    const prisma = {
      ...tx,
      user: {
        ...tx.user,
        findUnique: jest.fn(async () => ({ id: 'user', email: 'test@example.com' })),
      },
      passwordResetToken: {
        ...tx.passwordResetToken,
        create: jest.fn(async (_input: any) => ({ id: 'reset' })),
        delete: jest.fn(),
      },
      $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx),
    };
    const mail = {
      assertConfigured: jest.fn(),
      sendPasswordReset: jest.fn(
        async (_email: string, _token: string, _deliveryId: string) => undefined,
      ),
    };
    return {
      tx,
      prisma,
      mail,
      service: new AccountRecoveryService(
        prisma as unknown as PrismaService,
        mail as unknown as MailService,
      ),
    };
  }

  it('stores only the token hash and emails the raw one-time token', async () => {
    const { service, prisma, mail } = fixture();
    await expect(service.request('TEST@example.com')).resolves.toEqual({ ok: true });
    const token = mail.sendPasswordReset.mock.calls[0][1];
    expect(prisma.passwordResetToken.create.mock.calls[0][0].data.tokenHash).not.toBe(token);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
  });

  it('updates the password, invalidates all sessions and consumes all outstanding tokens', async () => {
    const { service, tx } = fixture();
    await service.reset('test-token', 'new-long-password');
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user' },
      data: { passwordHash: expect.any(String), sessionVersion: { increment: 1 } },
    });
    expect(tx.passwordResetToken.updateMany).toHaveBeenCalledTimes(2);
  });

  it('rejects expired, reused and concurrently claimed reset tokens', async () => {
    const { service, tx } = fixture(false);
    await expect(service.reset('used-token', 'new-long-password')).rejects.toThrow(
      /invalid or expired/,
    );
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
