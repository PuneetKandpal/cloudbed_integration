import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MockPaymentService } from '../services/mock-payment.service';
import { EventPublisher } from '@hostelworld/common';

@Injectable()
export class PaymentConsumer {
  constructor(
    private readonly payment: MockPaymentService,
    private readonly publisher: EventPublisher,
  ) {}

  @RabbitSubscribe({
    exchange: 'booking',
    routingKey: 'PAYMENT_AUTH_REQUIRED',
    queue: 'payment-auth',
  })
  handlePayment(payload: any) {
    try {
      const result = this.payment.charge(payload);

      this.publisher.publish('PAYMENT_SUCCESS', {
        bookingId: payload.bookingId,
        transactionId: result.transactionId,
      });
    } catch (e) {
      this.publisher.publish('PAYMENT_FAILED', {
        bookingId: payload.bookingId,
        reason: e.message,
      });
    }
  }
}
