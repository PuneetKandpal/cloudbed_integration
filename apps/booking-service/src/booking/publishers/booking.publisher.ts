import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { EVENT_NAMES } from '../../../../../libs/common/src/constants/event-names';
import { createBaseEvent } from '../../../../../libs/shared-events/src/index';
import { AppLogger } from '../../../../../libs/logger/src/logger.service';

const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';

/**
 * Emits booking-related events to RabbitMQ.
 */
@Injectable()
export class BookingPublisher {
  private client: ClientProxy;

  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(BookingPublisher.name);
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [RABBITMQ_URI],
        queue: 'booking_events',
        queueOptions: { durable: true },
      },
    });
  }

  async publishBookingCreated(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.BOOKING_CREATED, payload, 'booking-service', correlationId);
    this.client.emit(EVENT_NAMES.BOOKING_CREATED, event).subscribe();
    // TODO: await pattern if needed
  }

  async publishBookingUpdated(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.BOOKING_UPDATED, payload, 'booking-service', correlationId);
    this.client.emit(EVENT_NAMES.BOOKING_UPDATED, event).subscribe();
  }

  async publishBookingCancelled(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.BOOKING_CANCELLED, payload, 'booking-service', correlationId);
    this.client.emit(EVENT_NAMES.BOOKING_CANCELLED, event).subscribe();
  }
}
