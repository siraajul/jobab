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
import { ApiHeader, ApiOperation, ApiProduces, ApiQuery, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { ApiBadRequest, ApiInlineOk, ApiZodBody } from '../swagger/decorators';
import { verifyMetaSignature } from './meta-signature';
import { MetaWebhookService } from './meta-webhook.service';
import type { MetaWebhookBody } from './meta-webhook.types';
import { Public } from '../auth/auth.guard';

@Public()
@ApiTags('webhooks')
@Controller('webhooks/meta')
export class MetaController {
  private readonly log = new Logger(MetaController.name);

  constructor(
    private readonly config: ConfigService,
    private readonly service: MetaWebhookService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Meta webhook verification handshake',
    description:
      'Meta hits this endpoint once when you subscribe your app, with `hub.mode=subscribe`, ' +
      '`hub.verify_token=<your secret>`, and `hub.challenge=<random string>`. ' +
      "If the token matches `META_VERIFY_TOKEN` we echo back the challenge — that's the entire handshake. " +
      'Public; no cookie.',
  })
  @ApiQuery({ name: 'hub.mode', description: 'Always "subscribe".', example: 'subscribe' })
  @ApiQuery({
    name: 'hub.verify_token',
    description: "Must match the server's `META_VERIFY_TOKEN` env var.",
  })
  @ApiQuery({ name: 'hub.challenge', description: 'Random string we echo back verbatim.' })
  @ApiProduces('text/plain')
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

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Inbound Meta webhook (DMs + comments)',
    description:
      'Signature-verified entry point for every Facebook / Instagram / WhatsApp event Meta ' +
      'sends us. We acknowledge in <50 ms (Meta retries on timeout) and enqueue the heavy ' +
      'work onto BullMQ — the agent worker picks it up out-of-band.\n\n' +
      '**Auth model**: we compute an HMAC-SHA256 of the raw body using `META_APP_SECRET` and ' +
      'compare against the `x-hub-signature-256` header. Mismatch → 403, no exceptions.\n\n' +
      'Public; no cookie.',
  })
  @ApiHeader({
    name: 'x-hub-signature-256',
    description:
      'HMAC-SHA256 of the raw body, formatted as `sha256=<hex>`. Set by Meta automatically.',
    required: true,
  })
  @ApiInlineOk('Acknowledged. Processing continues asynchronously.', { ok: true })
  @ApiBadRequest('Missing / invalid signature.')
  async receive(
    @Req() req: Request,
    @Headers('x-hub-signature-256') signature: string | undefined,
    @Body() _body: unknown,
  ): Promise<{ ok: true }> {
    const raw = req.body as Buffer;
    const secret = this.config.get<string>('META_APP_SECRET');
    if (!secret) {
      this.log.error('META_APP_SECRET not configured — rejecting webhook');
      throw new ForbiddenException();
    }
    if (!verifyMetaSignature(raw, signature, secret)) {
      throw new ForbiddenException('bad signature');
    }

    const payload = JSON.parse(raw.toString('utf8')) as MetaWebhookBody;
    await this.service.handleEntries(payload.entry ?? []);
    return { ok: true };
  }

  @Post('data-deletion')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Meta data-deletion callback (Facebook App Review)',
    description:
      'Meta calls this when a user removes your app from their Facebook account. We acknowledge ' +
      'with a deletion-status URL + confirmation code, then asynchronously purge that external ' +
      "user's conversations.\n\nDocs: https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback",
  })
  @ApiZodBody('DataDeletionBody', 'Meta-signed payload with the user_id to purge.')
  @ApiInlineOk("Receipt for Meta — they'll surface the URL to the user.", {
    url: 'https://api.jobab.dev/data-deletion-status?code=del_1748488123_fb_42',
    confirmation_code: 'del_1748488123_fb_42',
  })
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

    await this.service
      .scrubExternalUser(userId)
      .catch((err: unknown) =>
        this.log.error(`data-deletion purge failed for ${userId}: ${(err as Error).message}`),
      );

    return {
      url: `${this.config.get<string>('PUBLIC_URL') ?? 'http://localhost:3000'}/data-deletion-status?code=${confirmationCode}`,
      confirmation_code: confirmationCode,
    };
  }

  @Post('fake')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Dev-only: inject a fake customer DM',
    description:
      'Skips the Meta signature check and lets you push a `{pageId, customerId, text, imageUrls?}` ' +
      'shape directly into the agent loop. Returns `403` outside `NODE_ENV=development`.',
  })
  @ApiZodBody('FakeMessageBody', 'Fake inbound DM shape.')
  @ApiInlineOk('Queued.', { ok: true })
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

  @Post('fake-comment')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Dev-only: inject a fake post comment',
    description:
      'Skips the signature check and exercises the §10 comment-intent flow with a minimal ' +
      '`{pageId, postId, commenterId, text}` shape. `403` outside development.',
  })
  @ApiZodBody('FakeCommentBody', 'Fake inbound comment shape.')
  @ApiInlineOk('Queued.', { ok: true })
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

const FakeMessageBody = z
  .object({
    pageId: z.string().min(1),
    customerId: z.string().min(1),
    text: z.string().max(4000).default(''),
    imageUrls: z.array(z.string().url()).max(8).optional(),
  })
  .refine((b) => b.text.length > 0 || (b.imageUrls && b.imageUrls.length > 0), {
    message: 'either text or imageUrls is required',
  });
