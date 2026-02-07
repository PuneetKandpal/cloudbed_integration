import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { BookingPolicyService } from './services/payment-policy.service';
import { BookingStoredConsumer } from './consumers/booking-stored.consumer';
import { PaymentPolicyPublisher } from './publishers/payment-policy.publisher';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'booking_policy_queue',
        },
      },
    ]),
  ],
  providers: [
    BookingPolicyService,
    BookingStoredConsumer,
    PaymentPolicyPublisher,
  ],
})
export class BookingPolicyModule {}
