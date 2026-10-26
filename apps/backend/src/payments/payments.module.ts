import { Global, Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { BkashProvider } from './bkash.provider';

@Global()
@Module({
  controllers: [PaymentsController],
  providers: [BkashProvider, PaymentsService],
  exports: [BkashProvider],
})
export class PaymentsModule {}
