import { Module } from '@nestjs/common';
import { MetaController } from './meta.controller';
import { MetaWebhookService } from './meta-webhook.service';

@Module({
  controllers: [MetaController],
  providers: [MetaWebhookService],
})
export class WebhooksModule {}
