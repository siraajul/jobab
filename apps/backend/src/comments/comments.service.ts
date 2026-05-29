import { Injectable, Logger } from '@nestjs/common';
import { CommentIntent, CommentReplyMode, ConversationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EnvService } from '../config/env.service';
import { EncryptionService } from '../common/encryption/encryption.service';
import { AgentQueueService } from '../queue/agent-queue.service';
import { IntentClassifier } from './intent-classifier';

/**
 * Rate-limit window per (org, post) for public replies. Meta flags pages
 * that reply too fast in a thread; 10/post/min is a conservative ceiling.
 */
const PUBLIC_REPLY_RATE_LIMIT = { perPostPerMinute: 10 };

interface IncomingComment {
  pageExternalId: string;
  commentId: string;
  postId: string;
  commenter: { id: string; name?: string };
  text: string;
  createdAt: Date;
}

@Injectable()
export class CommentsService {
  private readonly log = new Logger(CommentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly classifier: IntentClassifier,
    private readonly env: EnvService,
    private readonly encryption: EncryptionService,
    private readonly queue: AgentQueueService,
  ) {}

  async handle(comment: IncomingComment): Promise<void> {
    const page = await this.prisma.page.findFirst({
      where: { externalPageId: comment.pageExternalId, platform: 'facebook' },
    });
    if (!page) {
      this.log.warn(`comment webhook for unknown page ${comment.pageExternalId}`);
      return;
    }

    const dedupe = await this.prisma.comment.findUnique({
      where: { externalCommentId: comment.commentId },
    });
    if (dedupe) {
      this.log.debug(`comment ${comment.commentId} already processed`);
      return;
    }

    // Skip the page replying to its own comments (post-reply echo).
    if (comment.commenter.id === comment.pageExternalId) return;

    const classified = await this.classifier.classify(comment.text);
    const rule = await this.prisma.commentRule.findUnique({
      where: { organizationId_intent: { organizationId: page.organizationId, intent: classified.intent } },
    });

    const persisted = await this.prisma.comment.create({
      data: {
        organizationId: page.organizationId,
        pageId: page.id,
        externalCommentId: comment.commentId,
        postId: comment.postId,
        commenterExternalId: comment.commenter.id,
        commenterName: comment.commenter.name,
        content: comment.text,
        intent: classified.intent,
        intentConfidence: classified.confidence,
      },
    });

    // ── public reply ───────────────────────────────────────────────────────
    if (rule && rule.replyMode === CommentReplyMode.ai && rule.publicTemplate) {
      if (await this.withinRateLimit(page.organizationId, comment.postId)) {
        const sent = await this.postPublicReply(page.id, comment.commentId, rule.publicTemplate);
        if (sent) {
          await this.prisma.comment.update({
            where: { id: persisted.id },
            data: {
              publicReplyText: rule.publicTemplate,
              publicReplySent: true,
              publicReplyAt: new Date(),
            },
          });
        }
      } else {
        this.log.warn(`rate-limited public reply for post ${comment.postId}`);
      }
    }

    // ── private DM bridge ───────────────────────────────────────────────────
    if (rule && rule.privateAllowed && classified.intent !== 'spam') {
      await this.openDmBridge(persisted.id, page, comment, classified.intent);
    }
  }

  /** True if we're allowed to send another public reply on this post right now. */
  private async withinRateLimit(organizationId: string, postId: string): Promise<boolean> {
    const since = new Date(Date.now() - 60_000);
    const count = await this.prisma.comment.count({
      where: { organizationId, postId, publicReplySent: true, publicReplyAt: { gte: since } },
    });
    return count < PUBLIC_REPLY_RATE_LIMIT.perPostPerMinute;
  }

  /**
   * Public reply via Graph: POST /{COMMENT_ID}/comments. Falls back to a log
   * line when MESSENGER_DRY_RUN is on or the page has no real token (dev).
   */
  private async postPublicReply(
    pageId: string,
    commentId: string,
    text: string,
  ): Promise<boolean> {
    if (this.env.get('MESSENGER_DRY_RUN')) {
      this.log.log(`[dry-run] public reply to ${commentId}: "${text}"`);
      return true;
    }
    const page = await this.prisma.page.findUniqueOrThrow({ where: { id: pageId } });
    if (!page.accessToken || page.accessToken === 'dev-token-not-used-in-fake-mode') {
      this.log.warn('no real page token — skipping public reply');
      return false;
    }
    let token: string;
    try {
      token = this.encryption.decrypt(page.accessToken);
    } catch (e) {
      this.log.error(`token decrypt failed: ${(e as Error).message}`);
      return false;
    }
    const version = this.env.get('META_GRAPH_VERSION');
    const url = `https://graph.facebook.com/${version}/${commentId}/comments?access_token=${encodeURIComponent(token)}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        this.log.error(`Graph comment reply ${res.status}: ${await res.text()}`);
        return false;
      }
      return true;
    } catch (e) {
      this.log.error(`Graph comment reply network error: ${(e as Error).message}`);
      return false;
    }
  }

  /**
   * Open a private DM with the commenter and link it back to the comment.
   * Meta supports `recipient: { comment_id }` with `messaging_type=MESSAGE_TAG`
   * + `tag=POST_PURCHASE_UPDATE`/`HUMAN_AGENT`; we use a generic message and
   * let the agent loop take over once the customer replies. In dry-run mode
   * we just provision the conversation row.
   */
  private async openDmBridge(
    commentRowId: string,
    page: { id: string; organizationId: string; externalPageId: string },
    comment: IncomingComment,
    intent: CommentIntent,
  ): Promise<void> {
    const conv = await this.prisma.conversation.upsert({
      where: {
        pageId_externalUserId: { pageId: page.id, externalUserId: comment.commenter.id },
      },
      update: {
        lastCustomerMessageAt: comment.createdAt,
        customerName: comment.commenter.name ?? undefined,
      },
      create: {
        organizationId: page.organizationId,
        pageId: page.id,
        externalUserId: comment.commenter.id,
        customerName: comment.commenter.name ?? null,
        status: ConversationStatus.bot,
        lastCustomerMessageAt: comment.createdAt,
      },
    });

    // Persist the commenter's text as the first inbound message so the agent
    // loop has a starting point. The agent picks it up via the queue.
    const messagePrelude = `[from comment on post ${comment.postId}, intent=${intent}]\n${comment.text}`;
    const msg = await this.prisma.message.create({
      data: {
        conversationId: conv.id,
        direction: 'in',
        sender: 'customer',
        content: messagePrelude,
        attachments: { source: 'comment', commentId: comment.commentId, intent } as object,
      },
    });

    await this.prisma.comment.update({
      where: { id: commentRowId },
      data: {
        privateReplyConversationId: conv.id,
        privateReplySent: true,
      },
    });

    await this.queue.enqueue({ conversationId: conv.id, messageId: msg.id });
  }
}
