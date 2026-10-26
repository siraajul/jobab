import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AccountRecoveryService } from './account-recovery.service';
import { ConversationsService } from '../conversations/conversations.service';
import { OrdersService } from '../orders/orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';
import { MailService } from './mail.service';

const url = process.env.JOBAB_TEST_DATABASE_URL;
(url ? describe : describe.skip)('Merchant isolation and recovery (Postgres)', () => {
  const db = new PrismaClient({ datasources: url ? { db: { url } } : undefined });
  const session = new SessionService({ get: () => 'k'.repeat(32) } as unknown as EnvService);
  const auth = new AuthService(db as PrismaService, session);
  const guard = new AuthGuard(auth, new Reflector());
  const mail = {
    assertConfigured: jest.fn(),
    sendPasswordReset: jest.fn(async (_to: string, _token: string, _id: string) => undefined),
  };
  const recovery = new AccountRecoveryService(db as PrismaService, mail as unknown as MailService);
  let orgA: string,
    orgB: string,
    userId: string,
    email: string,
    conversationId: string,
    orderId: string;
  const password = 'long-fixture-password';

  beforeEach(async () => {
    const a = await db.organization.create({ data: { name: `security-a-${randomUUID()}` } });
    orgA = a.id;
    const b = await db.organization.create({ data: { name: `security-b-${randomUUID()}` } });
    orgB = b.id;
    email = `${randomUUID()}@example.test`;
    const user = await db.user.create({
      data: {
        email,
        passwordHash: await auth.hashPassword(password),
        memberships: { create: { organizationId: orgA, role: 'owner' } },
      },
    });
    userId = user.id;
    const page = await db.page.create({
      data: {
        organizationId: orgB,
        platform: 'facebook',
        externalPageId: randomUUID(),
        accessToken: 'encrypted-secret-must-not-leak',
      },
    });
    const conv = await db.conversation.create({
      data: { organizationId: orgB, pageId: page.id, externalUserId: randomUUID() },
    });
    conversationId = conv.id;
    const order = await db.order.create({
      data: {
        organizationId: orgB,
        conversationId,
        items: [],
        total: 100,
        customerName: 'Private',
        customerPhone: 'Private',
        customerAddress: 'Private',
      },
    });
    orderId = order.id;
  });
  afterEach(async () => {
    await db.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
    await db.user.delete({ where: { id: userId } });
    mail.sendPasswordReset.mockClear();
  });
  afterAll(async () => {
    await db.$disconnect();
  });

  it('rejects another merchant selected through either cookie or header', async () => {
    const cookie = session.sign(userId).value;
    for (const req of [
      { cookies: { jobab_session: cookie, jobab_org: orgB }, headers: {} },
      { cookies: { jobab_session: cookie }, headers: { 'x-org-id': orgB } },
    ]) {
      const ctx = {
        getHandler: () => function endpoint() {},
        getClass: () => class Controller {},
        switchToHttp: () => ({ getRequest: () => req }),
      } as unknown as ExecutionContext;
      await expect(guard.canActivate(ctx)).rejects.toThrow(/not a member/);
    }
  });

  it('denies cross-merchant conversation reads/takeover and order reads/payment mutations', async () => {
    const conversations = new ConversationsService(db as PrismaService, {} as never, {} as never);
    const orders = new OrdersService(db as PrismaService, {} as never);
    await expect(conversations.detail(orgA, conversationId)).rejects.toThrow();
    await expect(conversations.takeOver(orgA, conversationId)).rejects.toThrow();
    await expect(orders.detail(orgA, orderId)).rejects.toThrow();
    await expect(orders.markPaid(orgA, orderId)).rejects.toThrow();
    expect((await db.order.findUniqueOrThrow({ where: { id: orderId } })).paymentStatus).toBe(
      'pending',
    );
    const own = await conversations.detail(orgB, conversationId);
    expect(own.page).not.toHaveProperty('accessToken');
  });

  it('a reset link changes the password once, proves mailbox ownership, and revokes old cookies', async () => {
    const old = await auth.login(email, password);
    await recovery.request(email);
    const token = mail.sendPasswordReset.mock.calls[0][1];
    await recovery.reset(token, 'new-fixture-password');
    await expect(auth.loadFromSession(old.cookie.value)).resolves.toBeNull();
    await expect(auth.login(email, password)).rejects.toThrow();
    await expect(auth.login(email, 'new-fixture-password')).resolves.toBeDefined();
    await expect(recovery.reset(token, 'another-password')).rejects.toThrow(/invalid or expired/);
  });

  it('explicit session revocation invalidates all previously issued cookies', async () => {
    const old = await auth.login(email, password);
    await recovery.revokeSessions(userId);
    await expect(auth.loadFromSession(old.cookie.value)).resolves.toBeNull();
  });
});
