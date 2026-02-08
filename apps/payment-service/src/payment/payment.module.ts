import { Module } from '@nestjs/common';
import { MockPaymentService } from '../payment.service';
import { PaymentConsumer } from '../payment.consumer';
import { BookingPublisher } from '../payment.publisher';
import { LoggerService } from '../logger.service';

@Module({
  providers: [MockPaymentService, PaymentConsumer, BookingPublisher, LoggerService],
})
export class PaymentModule {}
