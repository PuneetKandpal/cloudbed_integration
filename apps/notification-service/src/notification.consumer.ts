import { Injectable } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { EmailService } from './email.service';
import { LoggerService } from './logger.service';

@Injectable()
export class NotificationConsumer {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('NotificationConsumer');
  }

  @RabbitSubscribe({
    exchange: 'booking',
    routingKey: 'BOOKING_CONFIRMED',
    queue: 'email-booking-confirmed',
  })
  async bookingConfirmed(data: any) {
    this.logger.log(
      `Processing booking confirmed notification for: ${data.bookingId}`,
    );

    await this.emailService.send(
      data.guestEmail,
      'Booking Confirmed',
      `Your booking ${data.bookingId} is confirmed.`,
    );
  }

  @RabbitSubscribe({
    exchange: 'booking',
    routingKey: 'PAYMENT_FAILED',
    queue: 'email-payment-failed',
  })
  async paymentFailed(data: any) {
    this.logger.log(
      `Processing payment failed notification for: ${data.bookingId}`,
    );

    await this.emailService.send(
      data.guestEmail,
      'Payment Failed',
      `Payment failed for booking ${data.bookingId}. Please update payment.`,
    );
  }

  @RabbitSubscribe({
    exchange: 'booking',
    routingKey: 'BOOKING_CANCELLED',
    queue: 'email-booking-cancelled',
  })
  async bookingCancelled(data: any) {
    this.logger.log(
      `Processing booking cancelled notification for: ${data.bookingId}`,
    );

    await this.emailService.send(
      data.guestEmail,
      'Booking Cancelled',
      `Your booking ${data.bookingId} was cancelled.`,
    );
  }
}
