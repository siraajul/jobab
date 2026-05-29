import { MetaWebhookService } from './meta-webhook.service';

/**
 * Verifies that webhook ingest finds-or-creates the conversation, persists
 * the message with image attachments, and enqueues an agent job.
 */
describe('MetaWebhookService.handleEntries', () => {
  let svc: MetaWebhookService;
  let prisma: any;
  let queue: any;

  beforeEach(() => {
    prisma = {
      page: { findFirst: jest.fn(async () => ({ id: 'p1', organizationId: 'org1' })) },
      conversation: { upsert: jest.fn(async () => ({ id: 'c1', organizationId: 'org1' })) },
      message: { create: jest.fn(async () => ({ id: 'm1' })) },
    };
    queue = { enqueue: jest.fn(async () => undefined) };
    svc = new MetaWebhookService(prisma, queue);
  });

  it('persists a plain text message and enqueues', async () => {
    await svc.handleEntries([
      {
        id: 'pageext',
        time: 1,
        messaging: [
          {
            sender: { id: 'cust' },
            recipient: { id: 'pageext' },
            timestamp: 1,
            message: { mid: 'm', text: 'hi' },
          },
        ],
      },
    ]);
    expect(prisma.conversation.upsert).toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalledWith({ conversationId: 'c1', messageId: 'm1' });
  });

  it('extracts image attachments into images array', async () => {
    await svc.handleEntries([
      {
        id: 'pageext',
        time: 1,
        messaging: [
          {
            sender: { id: 'cust' },
            recipient: { id: 'pageext' },
            timestamp: 1,
            message: {
              mid: 'm',
              text: '',
              attachments: [{ type: 'image', payload: { url: 'https://x/y.jpg' } }],
            },
          },
        ],
      },
    ]);
    const create = prisma.message.create.mock.calls[0][0].data;
    expect(create.attachments).toMatchObject({ images: ['https://x/y.jpg'] });
    expect(create.content).toContain('image');
  });

  it('skips echoes (messages we sent)', async () => {
    await svc.handleEntries([
      {
        id: 'pageext',
        time: 1,
        messaging: [
          {
            sender: { id: 'cust' },
            recipient: { id: 'pageext' },
            timestamp: 1,
            message: { mid: 'm', text: 'hi', is_echo: true },
          },
        ],
      },
    ]);
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
