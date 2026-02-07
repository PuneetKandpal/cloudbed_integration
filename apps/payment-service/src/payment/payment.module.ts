import { Module } from '@nestjs/common';
import { MockPaymentService } from './services/mock-payment.service';
import { PaymentConsumer } from './consumers/payment.consumer';

@Module({
  providers: [MockPaymentService, PaymentConsumer],
})
export class PaymentModule {}
