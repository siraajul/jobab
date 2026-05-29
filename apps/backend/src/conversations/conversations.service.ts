import { Injectable, NotFoundException } from '@nestjs/common';
import { ConversationStatus, Direction, Sender } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MessengerService } from '../messenger/messenger.service';
import { AgentQueueService } from '../queue/agent-queue.service';

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messenger: MessengerService,
    private readonly queue: AgentQueueService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.conversation.findMany({
      where: { organizationId },
      orderBy: { lastCustomerMessageAt: 'desc' },
      take: 100,
      include: {
        page: { select: { id: true, externalPageId: true, platform: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });
    return rows.map(flattenTags);
  }

  async detail(organizationId: string, id: string) {
    const conv = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        page: true,
        messages: { orderBy: { createdAt: 'asc' }, take: 200 },
        orders: { orderBy: { createdAt: 'desc' }, take: 1 },
        tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
      },
    });
    if (!conv) throw new NotFoundException();
    return flattenTags(conv);
  }

  // Apply an existing org tag to a conversation. Idempotent.
  async addTag(organizationId: string, conversationId: string, tagId: string) {
    await this.requireOwn(organizationId, conversationId);
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, organizationId },
    });
    if (!tag) throw new NotFoundException('tag not found');
    await this.prisma.conversationTag.upsert({
      where: { conversationId_tagId: { conversationId, tagId } },
      create: { conversationId, tagId },
      update: {},
    });
    return { ok: true };
  }

  async removeTag(organizationId: string, conversationId: string, tagId: string) {
    await this.requireOwn(organizationId, conversationId);
    await this.prisma.conversationTag.deleteMany({ where: { conversationId, tagId } });
    return { ok: true };
  }

  async listNotes(organizationId: string, conversationId: string) {
    await this.requireOwn(organizationId, conversationId);
    const rows = await this.prisma.note.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { name: true, email: true } } },
    });
    return rows.map((n) => ({
      id: n.id,
      body: n.body,
      authorName: n.author?.name ?? n.author?.email ?? null,
      createdAt: n.createdAt,
    }));
  }

  async addNote(
    organizationId: string,
    conversationId: string,
    authorUserId: string,
    body: string,
  ) {
    await this.requireOwn(organizationId, conversationId);
    const n = await this.prisma.note.create({
      data: { organizationId, conversationId, authorUserId, body },
      include: { author: { select: { name: true, email: true } } },
    });
    return {
      id: n.id,
      body: n.body,
      authorName: n.author?.name ?? n.author?.email ?? null,
      createdAt: n.createdAt,
    };
  }

  async deleteNote(organizationId: string, conversationId: string, noteId: string) {
    await this.requireOwn(organizationId, conversationId);
    await this.prisma.note.deleteMany({ where: { id: noteId, conversationId } });
    return { ok: true };
  }

  /** Older messages, paginated by createdAt cursor. Used by mobile thread
   *  pull-up-to-load-older. */
  async olderMessages(
    organizationId: string,
    id: string,
    beforeIso: string,
    limit = 50,
  ) {
    await this.requireOwn(organizationId, id);
    return this.prisma.message.findMany({
      where: { conversationId: id, createdAt: { lt: new Date(beforeIso) } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  /** AI agent runs for a conversation, newest first — powers the dashboard
   *  activity feed (which tools the AI fired, token spend, latency). */
  async activity(organizationId: string, id: string, limit = 50) {
    await this.requireOwn(organizationId, id);
    return this.prisma.agentRun.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      select: {
        id: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        costUsd: true,
        latencyMs: true,
        toolCalls: true,
        createdAt: true,
      },
    });
  }

  async takeOver(organizationId: string, id: string) {
    await this.requireOwn(organizationId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { status: ConversationStatus.human },
    });
  }

  async handBack(organizationId: string, id: string) {
    await this.requireOwn(organizationId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { status: ConversationStatus.bot },
    });
  }

  /**
   * Merchant confirms an image-match candidate. Persists a synthetic context
   * message and enqueues the agent to deliver a grounded customer-facing
   * reply. The agent loop already has access to the catalog so it can quote
   * the right price/variants — we don't need to send the reply directly.
   */
  async assertProduct(organizationId: string, conversationId: string, productId: string) {
    await this.requireOwn(organizationId, conversationId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, organizationId },
    });
    if (!product) throw new NotFoundException('product not found');

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        direction: Direction.in,
        sender: Sender.customer,
        content:
          `[merchant assertion] confirmed product match: ${product.title} (id=${product.id}). ` +
          `Tell the customer this is the matched product, quote the price exactly from search_catalog, ` +
          `and ask which variant they want.`,
      },
    });
    await this.queue.enqueue({ conversationId, messageId: msg.id });
    return { ok: true, productTitle: product.title };
  }

  async sendMerchantReply(organizationId: string, id: string, text: string) {
    await this.requireOwn(organizationId, id);
    // Persist the merchant message …
    const msg = await this.prisma.message.create({
      data: {
        conversationId: id,
        direction: Direction.out,
        sender: Sender.human,
        content: text,
      },
    });
    // … and hand off to the Send API (currently a stub).
    await this.messenger.sendText(id, text);
    return msg;
  }

  private async requireOwn(organizationId: string, id: string) {
    const exists = await this.prisma.conversation.count({ where: { id, organizationId } });
    if (!exists) throw new NotFoundException();
  }
}

/** Collapse the `ConversationTag` join rows into a flat `tags` array of the
 *  labels themselves — the shape the dashboard consumes. */
function flattenTags<T extends { tags: Array<{ tag: unknown }> }>(conv: T) {
  return { ...conv, tags: conv.tags.map((ct) => ct.tag) };
}
