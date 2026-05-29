import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { SendReplyBodySchema } from '@jobab/shared';
import { OrgId } from '../auth/auth.guard';
import { ConversationsService } from './conversations.service';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly svc: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: 'List recent conversations for the org' })
  list(@OrgId() orgId: string) {
    return this.svc.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single conversation with its messages and active order' })
  detail(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.detail(orgId, id);
  }

  @Get(':id/messages/older')
  @ApiOperation({ summary: 'Paginated older messages (cursor: before createdAt)' })
  older(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Query('before') before: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.olderMessages(orgId, id, before, limit ? Number(limit) : 50);
  }

  @Post(':id/takeover')
  @HttpCode(200)
  @ApiOperation({ summary: 'Merchant takes over from the AI' })
  takeover(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.takeOver(orgId, id);
  }

  @Post(':id/hand-back')
  @HttpCode(200)
  @ApiOperation({ summary: 'Hand the conversation back to the AI' })
  handBack(@OrgId() orgId: string, @Param('id') id: string) {
    return this.svc.handBack(orgId, id);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Send a merchant reply' })
  reply(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { text } = SendReplyBodySchema.parse(body);
    return this.svc.sendMerchantReply(orgId, id, text);
  }

  @Post(':id/assert-product')
  @ApiOperation({ summary: 'Merchant confirms an image-match candidate; the AI will reply with grounded info' })
  assertProduct(@OrgId() orgId: string, @Param('id') id: string, @Body() body: unknown) {
    const { productId } = AssertProductBody.parse(body);
    return this.svc.assertProduct(orgId, id, productId);
  }
}

const AssertProductBody = z.object({ productId: z.string().min(1) });
