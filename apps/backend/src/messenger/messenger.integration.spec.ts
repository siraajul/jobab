import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { MessengerService } from './messenger.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { EnvService } from '../config/env.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

const url = process.env.JOBAB_TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  'Message delivery and takeover (Postgres, mocked provider)',
  () => {
    // Keep the pool smaller than the duplicate burst to catch connection starvation.
    const testUrl = url ? new URL(url) : undefined;
    testUrl?.searchParams.set('connection_limit', '2');
    const db = new PrismaClient({
      datasources: testUrl ? { db: { url: testUrl.href } } : undefined,
    });
    const settings: Record<string, unknown> = {
      ENCRYPTION_KEY: 'k'.repeat(32),
      PROVIDER_TIMEOUT_MS: 1000,
      MESSENGER_DRY_RUN: false,
      META_GRAPH_VERSION: 'v22.0',
    };
    const env = { get: (key: string) => settings[key] } as EnvService;
    const encryption = new EncryptionService(env);
    const service = new MessengerService(db as PrismaService, env, encryption);
    const originalFetch = global.fetch;
    let orgId: string;
    let conversationId: string;
    let sourceId: string;

    beforeEach(async () => {
      const org = await db.organization.create({ data: { name: `delivery-test-${randomUUID()}` } });
      orgId = org.id;
      const page = await db.page.create({
        data: {
          organizationId: orgId,
          platform: 'facebook',
          externalPageId: randomUUID(),
          accessToken: encryption.encrypt('test-token'),
        },
      });
      const conv = await db.conversation.create({
        data: {
          organizationId: orgId,
          pageId: page.id,
          externalUserId: randomUUID(),
          lastCustomerMessageAt: new Date(),
        },
      });
      conversationId = conv.id;
      const source = await db.message.create({
        data: { conversationId, direction: 'in', sender: 'customer', content: 'hello' },
      });
      sourceId = source.id;
    });
    afterEach(async () => {
      global.fetch = originalFetch;
      await db.organization.delete({ where: { id: orgId } });
    });
    afterAll(async () => {
      await db.$disconnect();
    });

    it('sends once for concurrent duplicate jobs and retains the provider receipt', async () => {
      const fetchMock = jest.fn(async () => ({
        ok: true,
        json: async () => ({ message_id: 'receipt1' }),
      }));
      global.fetch = fetchMock as unknown as typeof fetch;
      const options = { replyToMessageId: sourceId, automationVersion: 0 };
      // Wait for every attempt even on failure so cleanup cannot race a live send.
      const results = await Promise.allSettled(
        Array.from({ length: 8 }, () =>
          service.sendText(conversationId, 'reply', undefined, options),
        ),
      );
      const failures = results.flatMap((result) =>
        result.status === 'rejected' ? [String(result.reason)] : [],
      );
      expect(failures).toEqual([]);
      const replies = results.flatMap((result) =>
        result.status === 'fulfilled' && result.value ? [result.value.id] : [],
      );
      expect(new Set(replies).size).toBe(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(await db.message.count({ where: { conversationId, direction: 'out' } })).toBe(1);
      expect(await db.message.findUnique({ where: { replyToMessageId: sourceId } })).toMatchObject({
        deliveryStatus: 'sent',
        externalDeliveryId: 'receipt1',
      });
    });

    it('does not repeat an ambiguous network send when the job retries', async () => {
      const fetchMock = jest.fn(async () => {
        throw new Error('connection lost');
      });
      global.fetch = fetchMock;
      const send = () =>
        service.sendText(conversationId, 'reply', undefined, {
          replyToMessageId: sourceId,
          automationVersion: 0,
        });
      await expect(send()).rejects.toThrow(/unknown/);
      await expect(send()).rejects.toThrow(/unknown/);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(await db.message.findUnique({ where: { replyToMessageId: sourceId } })).toMatchObject({
        deliveryStatus: 'unknown',
      });
    });

    it('blocks an old generation after merchant takeover', async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock;
      await db.conversation.update({
        where: { id: conversationId },
        data: { status: 'human', automationVersion: 1 },
      });
      await expect(
        service.sendText(conversationId, 'stale', undefined, {
          replyToMessageId: sourceId,
          automationVersion: 0,
        }),
      ).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('persists one human message for a merchant reply', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        json: async () => ({ message_id: 'human-receipt' }),
      })) as unknown as typeof fetch;
      const conversations = new ConversationsService(db as PrismaService, service, {} as never);
      await conversations.sendMerchantReply(orgId, conversationId, 'Human reply');
      expect(
        await db.message.findMany({ where: { conversationId, direction: 'out' } }),
      ).toMatchObject([{ sender: 'human', content: 'Human reply', deliveryStatus: 'sent' }]);
    });
  },
);
