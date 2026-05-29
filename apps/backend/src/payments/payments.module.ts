import { Global, Module } from '@nestjs/common';
import { BkashProvider } from './bkash.provider';

@Global()
@Module({
  providers: [BkashProvider],
  exports: [BkashProvider],
})
export class PaymentsModule {}
