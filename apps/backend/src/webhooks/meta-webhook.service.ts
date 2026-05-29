import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { Direction, Sender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AgentQueueService } from '../queue/agent-queue.service';
import { CommentsService } from '../comments/comments.service';
import { MetaEntry, MetaFeedChangeValue, MetaMessagingEvent } from './meta-webhook.types';

@Injectable()
export class MetaWebhookService {
  private readonly log = new Logger(MetaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: AgentQueueService,
    @Optional() @Inject(CommentsService) private readonly comments?: CommentsService,
  ) {}

  /**
   * Meta-required data deletion: scrub every conversation/message belonging
   * to a Facebook user. We delete the conversation rows outright (cascades
   * messages and agent_runs); the merchant's orders are kept (the merchant
   * needs them for accounting) but with PII zeroed.
   */
  async scrubExternalUser(externalUserId: string): Promise<void> {
    if (!externalUserId || externalUserId === 'unknown') return;
    const convs = await this.prisma.conversation.findMany({
      where: { externalUserId },
      select: { id: true },
    });
    if (convs.length === 0) return;
    const ids = convs.map((c) => c.id);
    await this.prisma.order.updateMany({
      where: { conversationId: { in: ids } },
      data: {
        customerName: '[deleted]',
        customerPhone: '[deleted]',
        customerAddress: '[deleted]',
      },
    });
    await this.prisma.conversation.deleteMany({ where: { id: { in: ids } } });
    this.log.log(`scrubbed ${ids.length} conversation(s) for external user ${externalUserId}`);
  }

  async handleEntries(entries: MetaEntry[]): Promise<void> {
    for (const entry of entries) {
      // Messenger DMs
      for (const event of entry.messaging ?? []) {
        if (event.message?.is_echo) continue;
        try {
          await this.handleMessagingEvent(entry.id, event);
        } catch (err) {
          this.log.error(`failed to handle messaging event from page=${entry.id}`, err as Error);
        }
      }

      // Page feed (comments)
      for (const change of entry.changes ?? []) {
        if (change.field !== 'feed') continue;
        if (change.value.item !== 'comment' || change.value.verb !== 'add') continue;
        try {
          await this.handleCommentEvent(entry.id, change.value);
        } catch (err) {
          this.log.error(`failed to handle comment from page=${entry.id}`, err as Error);
        }
      }
    }
  }

  private async handleCommentEvent(externalPageId: string, value: MetaFeedChangeValue) {
    if (!this.comments) return;
    if (!value.comment_id || !value.post_id || !value.from || !value.message) return;
    await this.comments.handle({
      pageExternalId: externalPageId,
      commentId: value.comment_id,
      postId: value.post_id,
      commenter: { id: value.from.id, name: value.from.name },
      text: value.message,
      createdAt: value.created_time
        ? new Date(value.created_time * 1000)
        : new Date(),
    });
  }

  private async handleMessagingEvent(externalPageId: string, event: MetaMessagingEvent) {
    const page = await this.prisma.page.findFirst({
      where: { externalPageId, platform: 'facebook' },
    });
    if (!page) {
      this.log.warn(`webhook for unknown page ${externalPageId}`);
      return;
    }

    const externalUserId = event.sender.id;
    const rawAttachments = event.message?.attachments ?? null;

    // Pull image URLs out of attachments so the agent can see them in context
    // and decide whether to call match_product_by_image.
    const imageUrls = (rawAttachments ?? [])
      .filter((a) => a.type === 'image' && a.payload?.url)
      .map((a) => a.payload!.url!);

    // Compose the persisted text: keep the customer's actual words, but if
    // they sent images-only (sticker reaction or saree screenshot with no
    // caption), substitute a placeholder so the agent still sees something.
    const userText = event.message?.text ?? event.postback?.payload ?? '';
    const text =
      userText ||
      (imageUrls.length > 0
        ? `[customer sent ${imageUrls.length} image${imageUrls.length === 1 ? '' : 's'}]`
        : '');
    const attachments = imageUrls.length > 0
      ? { images: imageUrls, raw: rawAttachments }
      : rawAttachments;

    // Find-or-create the conversation, scoped by (page, customer).
    const conversation = await this.prisma.conversation.upsert({
      where: { pageId_externalUserId: { pageId: page.id, externalUserId } },
      update: { lastCustomerMessageAt: new Date(event.timestamp) },
      create: {
        organizationId: page.organizationId,
        pageId: page.id,
        externalUserId,
        lastCustomerMessageAt: new Date(event.timestamp),
      },
    });

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: Direction.in,
        sender: Sender.customer,
        content: text,
        attachments: attachments ? (attachments as object) : undefined,
        raw: event as unknown as object,
      },
    });

    // Hand off to the agent worker. If the human has taken over, the worker
    // will detect status=human and no-op.
    await this.queue.enqueue({ conversationId: conversation.id, messageId: message.id });
  }
}
