import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger, Optional, NotFoundException } from '@nestjs/common';
import { Direction, Sender, type Platform } from '@prisma/client';
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
      where: { OR: [{ externalUserId }, { page: { connectedFacebookUserId: externalUserId } }] },
      select: { id: true },
    });
    if (convs.length === 0) {
      await this.prisma.page.updateMany({
        where: { connectedFacebookUserId: externalUserId },
        data: { accessToken: '', status: 'disconnected', connectedFacebookUserId: null },
      });
      return;
    }
    const ids = convs.map((c) => c.id);
    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { conversationId: { in: ids } },
        data: {
          customerName: '[deleted]',
          customerPhone: '[deleted]',
          customerAddress: '[deleted]',
        },
      });
      await tx.page.updateMany({
        where: { connectedFacebookUserId: externalUserId },
        data: { accessToken: '', status: 'disconnected', connectedFacebookUserId: null },
      });
      await tx.agentRun.deleteMany({ where: { conversationId: { in: ids } } });
      await tx.message.deleteMany({ where: { conversationId: { in: ids } } });
      await tx.note.deleteMany({ where: { conversationId: { in: ids } } });
      await tx.comment.deleteMany({ where: { commenterExternalId: externalUserId } });
      for (const id of ids)
        await tx.conversation.update({
          where: { id },
          data: {
            externalUserId: `deleted_${id}`,
            customerName: null,
            customerPhone: null,
            customerAddress: null,
            lastCustomerMessageAt: null,
            assignedUserId: null,
            handoffReason: null,
            handoffCategory: null,
            status: 'closed',
            automationVersion: { increment: 1 },
          },
        });
    });
    this.log.log(`scrubbed ${ids.length} customer conversation(s)`);
  }

  async recordDeletion(code: string) {
    await this.prisma.deletionReceipt.create({ data: { code } });
  }

  async deletionStatus(code: string) {
    const receipt = await this.prisma.deletionReceipt.findUnique({ where: { code } });
    if (!receipt) throw new NotFoundException('Deletion receipt not found');
    return { status: 'completed', completedAt: receipt.completedAt };
  }

  async handleEntries(entries: MetaEntry[], platform: Platform = 'facebook'): Promise<void> {
    for (const entry of entries) {
      // Messenger DMs
      for (const event of entry.messaging ?? []) {
        if (event.message?.is_echo) continue;
        try {
          await this.handleMessagingEvent(entry.id, event, platform);
        } catch (err) {
          this.log.error(`message ingestion failed for page=${entry.id}`);
          throw err;
        }
      }

      // Page feed (comments)
      for (const change of entry.changes ?? []) {
        if (change.field === 'messages' && change.value.metadata?.phone_number_id) {
          for (const message of change.value.messages ?? []) {
            const supported = message.type === 'text';
            await this.handleMessagingEvent(
              change.value.metadata.phone_number_id,
              {
                sender: { id: message.from },
                recipient: { id: change.value.metadata.phone_number_id },
                timestamp: Number(message.timestamp) * 1000,
                message: {
                  mid: message.id,
                  text: supported
                    ? (message.text?.body ?? '')
                    : `[Unsupported WhatsApp ${message.type}; merchant review required]`,
                },
              },
              'whatsapp',
              !supported,
            );
          }
          continue;
        }
        if (change.field !== 'feed') continue;
        if (change.value.item !== 'comment' || change.value.verb !== 'add') continue;
        try {
          await this.handleCommentEvent(entry.id, change.value);
        } catch (err) {
          this.log.error(`comment ingestion failed for page=${entry.id}`);
          throw err;
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
      createdAt: value.created_time ? new Date(value.created_time * 1000) : new Date(),
    });
  }

  private async handleMessagingEvent(
    externalPageId: string,
    event: MetaMessagingEvent,
    platform: Platform,
    needsHuman = false,
  ) {
    const page = await this.prisma.page.findFirst({
      where: { externalPageId, platform },
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
    const attachments =
      imageUrls.length > 0 ? { images: imageUrls, raw: rawAttachments } : rawAttachments;

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

    const externalMessageId = createHash('sha256')
      .update(`${platform}:${externalPageId}:${event.message?.mid ?? JSON.stringify(event)}`)
      .digest('hex');
    const message = await this.prisma.message.upsert({
      where: { externalMessageId },
      update: {},
      create: {
        conversationId: conversation.id,
        externalMessageId,
        direction: Direction.in,
        sender: Sender.customer,
        content: text,
        attachments: attachments ? (attachments as object) : undefined,
        raw: event as unknown as object,
      },
    });

    if (needsHuman) {
      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: 'needs_human',
          handoffCategory: 'other',
          handoffReason: 'Unsupported WhatsApp media; review the original channel',
          automationVersion: { increment: 1 },
        },
      });
      return;
    }
    // Hand off to the agent worker. If the human has taken over, the worker
    // will detect status=human and no-op.
    await this.queue.enqueue({ conversationId: conversation.id, messageId: message.id });
  }
}
