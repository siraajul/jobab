import { Global, Module } from '@nestjs/common';
import { OrderGuardrail } from './order.guardrail';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payments.module';

@Global()
@Module({
  imports: [PaymentsModule],
  controllers: [OrdersController],
  providers: [OrderGuardrail, OrdersService],
  exports: [OrderGuardrail],
})
export class OrdersModule {}
