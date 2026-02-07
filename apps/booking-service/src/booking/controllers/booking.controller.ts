import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WebhookGuard } from '@hostelworld/common';
import { BookingService } from '../services/booking.service';

/**
 * Receives Cloudbeds webhooks. Emits booking-related events via publisher.
 */
@Controller('webhooks/cloudbeds')
@UseGuards(WebhookGuard)
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post('booking')
  async handleBookingWebhook(@Body() payload: unknown) {
    // TODO: Parse payload, call bookingService, emit events via BookingPublisher
    return { received: true };
  }
}
