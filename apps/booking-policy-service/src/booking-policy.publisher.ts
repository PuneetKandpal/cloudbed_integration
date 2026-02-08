import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentPolicyPublisher {
  constructor(private readonly client: ClientProxy) {}

  requestPayment(booking: any) {
    return this.client.emit('PAYMENT_AUTH_REQUIRED', {
      reservationId: booking.id,
      amount: booking.amount,
      guestEmail: booking.guestEmail,
    });
  }
}
