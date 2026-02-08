import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { LoggerService } from './logger.service';
import { EVENT_NAMES } from '@hostelworld/common';

/**
 * RabbitMQ consumers for booking-service.
 * TODO: Subscribe to events from other services if needed (e.g. cloudbeds.booking.received).
 */
@Controller()
export class BookingConsumer {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('BookingConsumer');
  }

  // TODO: @EventPattern(EVENT_NAMES.CLOUDBEDS_BOOKING_RECEIVED) handleCloudbedsBooking(payload)
}
