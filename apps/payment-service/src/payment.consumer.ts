import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MockPaymentService } from './payment.service';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { LoggerService } from './logger.service';

@Injectable()
export class PaymentConsumer {
  private publisher: ClientProxy;

  constructor(
    private readonly payment: MockPaymentService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PaymentConsumer');

    this.publisher = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
        queue: 'payment_events',
        queueOptions: { durable: true },
      },
    });
  }

  @RabbitSubscribe({
    exchange: 'booking',
    routingKey: 'PAYMENT_AUTH_REQUIRED',
    queue: 'payment-auth',
  })
  handlePayment(payload: any) {
    try {
      this.logger.log(`Processing payment for booking: ${payload.bookingId}`);

      const result = this.payment.charge(payload);

      this.publisher
        .emit('PAYMENT_SUCCESS', {
          bookingId: payload.bookingId,
          transactionId: result.transactionId,
        })
        .subscribe();

      this.logger.log(
        `Payment successful for booking: ${payload.bookingId}, transaction: ${result.transactionId}`,
      );
    } catch (e) {
      this.logger.error(
        `Payment failed for booking: ${payload.bookingId}`,
        e.message,
      );

      this.publisher
        .emit('PAYMENT_FAILED', {
          bookingId: payload.bookingId,
          reason: e.message,
        })
        .subscribe();
    }
  }
}
