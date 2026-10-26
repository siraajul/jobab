import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const databaseUrl = process.env.JOBAB_TEST_DATABASE_URL;
if (!databaseUrl)
  throw new Error(
    'Browser gates require a disposable JOBAB_TEST_DATABASE_URL; they never silently skip.',
  );
const { PrismaClient } = createRequire(resolve(process.cwd(), '../backend/package.json'))(
  '@prisma/client',
);
const db = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
let pageExternalId: string;
let orgId: string, userId: string, email: string, conversationId: string;
const password = 'test-only-long-password';

test.beforeEach(async ({ page }) => {
  email = `${randomUUID()}@example.test`;
  const signup = await page.request.post('/api/backend/auth/sign-up', {
    data: { email, password, name: 'Test Owner', organizationName: 'Readiness test shop' },
  });
  expect(signup.ok()).toBeTruthy();
  const user = await signup.json();
  userId = user.userId;
  orgId = user.memberships[0].organizationId;
  pageExternalId = randomUUID();
  const pageRow = await db.page.create({
    data: {
      organizationId: orgId,
      platform: 'facebook',
      externalPageId: pageExternalId,
      accessToken: 'dev-token-not-used-in-fake-mode',
    },
  });
  const conv = await db.conversation.create({
    data: {
      organizationId: orgId,
      pageId: pageRow.id,
      externalUserId: randomUUID(),
      customerName: 'Readiness Customer',
      customerPhone: '01700000000',
      customerAddress: 'Test address',
      lastCustomerMessageAt: new Date(),
    },
  });
  conversationId = conv.id;
  await db.message.create({
    data: { conversationId, direction: 'in', sender: 'customer', content: 'লাল শাড়ি আছে?' },
  });
});
test.afterEach(async () => {
  if (orgId) await db.organization.deleteMany({ where: { id: orgId } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
});
test.afterAll(async () => {
  await db.$disconnect();
});

test('signed duplicate webhook → one inbound message → one queued AI reply', async ({ page }) => {
  const conv = await db.conversation.findUniqueOrThrow({ where: { id: conversationId } });
  const mid = randomUUID();
  const body = JSON.stringify({
    object: 'page',
    entry: [
      {
        id: pageExternalId,
        time: Date.now(),
        messaging: [
          {
            sender: { id: conv.externalUserId },
            recipient: { id: pageExternalId },
            timestamp: Date.now(),
            message: { mid, text: 'শাড়ির দাম কত?' },
          },
        ],
      },
    ],
  });
  const signature =
    'sha256=' + createHmac('sha256', process.env.META_APP_SECRET!).update(body).digest('hex');
  for (let i = 0; i < 2; i++) {
    const response = await page.request.post('/api/backend/webhooks/meta', {
      data: body,
      headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
    });
    expect(response.ok()).toBeTruthy();
  }
  await expect
    .poll(
      async () =>
        db.message.count({
          where: { conversationId, direction: 'out', deliveryStatus: 'dry_run' },
        }),
      { timeout: 20000 },
    )
    .toBe(1);
  expect(
    await db.message.count({
      where: { conversationId, direction: 'in', content: 'শাড়ির দাম কত?' },
    }),
  ).toBe(1);
});

test('login → inbox → takeover → one persisted human reply → logout', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/inbox/);
  await page.getByRole('button').filter({ hasText: 'Readiness Customer' }).first().click();
  await page.getByRole('button', { name: /take over/i }).click();
  await expect(page.getByRole('button', { name: /take over/i })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.getByRole('textbox', { name: 'Reply', exact: true }).fill('আপনার অর্ডারটি দেখছি।');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Reply', exact: true })).toHaveValue('');
  await expect(
    page
      .getByRole('main')
      .locator('[aria-live=polite]')
      .getByText('আপনার অর্ডারটি দেখছি।', { exact: true }),
  ).toBeVisible();
  const sent = await db.message.findMany({ where: { conversationId, direction: 'out' } });
  expect(sent).toHaveLength(1);
  expect(sent[0].sender).toBe('human');
  expect(sent[0].deliveryStatus).toBe('dry_run');
  await page.request.post('/api/backend/auth/logout');
  await page.goto('/inbox');
  await expect(page).toHaveURL(/\/login/);
});

test('order payment and status changes persist across reload', async ({ page }) => {
  const order = await db.order.create({
    data: {
      organizationId: orgId,
      conversationId,
      customerName: 'Readiness Customer',
      customerPhone: '01700000000',
      customerAddress: 'Test address',
      items: [],
      total: 100,
    },
  });
  await page.goto('/orders');
  await page.getByRole('button', { name: 'Mark paid', exact: true }).click();
  await expect
    .poll(async () => (await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus)
    .toBe('paid');
  await page.reload();
  await expect(page.getByRole('article').getByText('Paid', { exact: true })).toBeVisible();
});

test('reset link updates password, invalidates old sessions, and cannot be reused', async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByRole('button', { name: 'Email reset link' }).click();
  await expect(page.getByRole('status')).toContainText('If an account exists');
  const records = await db.passwordResetToken.findMany({
    where: { userId },
    orderBy: { expiresAt: 'desc' },
  });
  expect(records).toHaveLength(1);
  const outbox = resolve('../backend/.jobab/mail');
  await expect
    .poll(async () => (await readdir(outbox)).includes(`${records[0].id}.json`))
    .toBe(true);
  const message = JSON.parse(await readFile(resolve(outbox, `${records[0].id}.json`), 'utf8')) as {
    text: string;
  };
  const link = message.text.match(/http[^\s]+/)![0];
  await page.goto(`/login${new URL(link).search}`);
  await page.getByLabel(/New password/).fill('updated-long-test-password');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByRole('status')).toContainText('Password updated');
  const reused = await page.request.post('/api/backend/auth/reset-password', {
    data: { token: new URL(link).searchParams.get('reset'), password: 'second-long-test-password' },
  });
  expect(reused.status()).toBe(400);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill('updated-long-test-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/inbox/);
  await page.request.post('/api/backend/auth/revoke-sessions');
  expect((await page.request.get('/api/backend/auth/me')).status()).toBe(401);
});
