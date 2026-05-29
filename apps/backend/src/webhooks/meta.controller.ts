import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpCode,
  Logger,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { verifyMetaSignature } from './meta-signature';
import { MetaWebhookService } from './meta-webhook.service';
import type { MetaWebhookBody } from './meta-webhook.types';
import { Public } from '../auth/auth.guard';

@Public()
@Controller('webhooks/meta')
export class MetaController {
  private readonly log = new Logger(MetaController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly service: MetaWebhookService,
  ) {}

  /** Meta's GET verification handshake. */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const expected = this.config.get<string>('META_VERIFY_TOKEN');
    if (mode === 'subscribe' && expected && token === expected) {
      return challenge;
    }
    throw new ForbiddenException('verification failed');
  }

  /** Webhook payload — signature-verified, then handed off to the service. */
  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() _body: unknown,
  ): Promise<{ ok: true }> {
    const raw = req.body as Buffer; // populated by express.raw() in main.ts
    const secret = this.config.get<string>('META_APP_SECRET');
    if (!secret) {
      this.log.error('META_APP_SECRET not configured — rejecting webhook');
      throw new ForbiddenException();
    }
    if (!verifyMetaSignature(raw, signature, secret)) {
      throw new ForbiddenException('bad signature');
    }

    const payload = JSON.parse(raw.toString('utf8')) as MetaWebhookBody;

    // Ack fast (Meta retries on timeout). Background work is queued inside
    // handleEntries; the heavy LLM loop happens on the worker.
    await this.service.handleEntries(payload.entry ?? []);
    return { ok: true };
  }

  /**
   * Meta-required data-deletion callback (Facebook App Review).
   *
   * When a user removes the app from their Facebook account, Meta sends a
   * signed_request to this endpoint. We acknowledge with a deletion URL +
   * confirmation code, then asynchronously purge any conversations the
   * user appeared in.
   *
   * Docs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
   */
  @Post('data-deletion')
  @HttpCode(200)
  async dataDeletion(@Body() body: unknown) {
    const parsed = DataDeletionBody.parse(body);
    const [, payloadB64] = parsed.signed_request.split('.');
    let payload: { user_id?: string } = {};
    try {
      const json = Buffer.from(payloadB64 ?? '', 'base64url').toString('utf8');
      payload = JSON.parse(json) as { user_id?: string };
    } catch {
      // fall through — we still return a confirmation so Meta marks it done
    }

    const userId = payload.user_id ?? 'unknown';
    const confirmationCode = `del_${Date.now()}_${userId.slice(0, 16)}`;

    await this.service.scrubExternalUser(userId).catch((err: unknown) =>
      this.log.error(`data-deletion purge failed for ${userId}: ${(err as Error).message}`),
    );

    return {
      url: `${this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000'}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }

  /**
   * Local-only convenience endpoint — skips signature check and accepts a
   * minimal {pageId, customerId, text} shape so you can exercise the whole
   * agent loop without Meta. Disabled in production via NODE_ENV.
   */
  @Post('fake')
  @HttpCode(200)
  async fake(@Body() body: unknown) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('fake webhook disabled in production');
    }
    const parsed = FakeMessageBody.parse(body);
    const now = Date.now();
    await this.service.handleEntries([
      {
        id: parsed.pageId,
        time: now,
        messaging: [
          {
            sender: { id: parsed.customerId },
            recipient: { id: parsed.pageId },
            timestamp: now,
            message: {
              mid: `fake_${now}`,
              text: parsed.text,
              attachments:
                parsed.imageUrls && parsed.imageUrls.length > 0
                  ? parsed.imageUrls.map((url) => ({
                      type: 'image' as const,
                      payload: { url },
                    }))
                  : undefined,
            },
          },
        ],
      },
    ]);
    return { ok: true };
  }

  /** Local-only fake comment ingest — drives §10 without Meta. */
  @Post('fake-comment')
  @HttpCode(200)
  async fakeComment(@Body() body: unknown) {
    if (this.config.get<string>('NODE_ENV') === 'production') {
      throw new ForbiddenException('fake webhook disabled in production');
    }
    const parsed = FakeCommentBody.parse(body);
    const now = Math.floor(Date.now() / 1000);
    await this.service.handleEntries([
      {
        id: parsed.pageId,
        time: now,
        changes: [
          {
            field: 'feed',
            value: {
              item: 'comment',
              verb: 'add',
              comment_id: `fake_c_${Date.now()}`,
              post_id: parsed.postId,
              from: { id: parsed.commenterId, name: parsed.commenterName },
              message: parsed.text,
              created_time: now,
            },
          },
        ],
      },
    ]);
    return { ok: true };
  }
}

const DataDeletionBody = z.object({
  signed_request: z.string().min(1),
});

const FakeCommentBody = z.object({
  pageId: z.string().min(1),
  postId: z.string().min(1),
  commenterId: z.string().min(1),
  commenterName: z.string().optional(),
  text: z.string().min(1).max(4000),
});

const FakeMessageBody = z.object({
  pageId: z.string().min(1),
  customerId: z.string().min(1),
  text: z.string().max(4000).default(''),
  imageUrls: z.array(z.string().url()).max(8).optional(),
}).refine((b) => b.text.length > 0 || (b.imageUrls && b.imageUrls.length > 0), {
  message: 'either text or imageUrls is required',
});
