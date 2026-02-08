import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BookingPolicyService } from './payment-policy.service';
import { PaymentPolicyPublisher } from './booking-policy.publisher';

@Controller()
export class BookingStoredConsumer {
  constructor(
    private readonly policyService: BookingPolicyService,
    private readonly publisher: PaymentPolicyPublisher,
  ) {}

  @EventPattern('BOOKING_STORED')
  async handle(@Payload() event: any) {
    const decision = this.policyService.evaluate(event.booking);

    if (decision === 'PAY_NOW') {
      await this.publisher.requestPayment(event.booking);
    }
  }
}
