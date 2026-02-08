import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { EVENT_NAMES } from '@hostelworld/common';
import { createBaseEvent } from '@hostelworld/shared-events';
import { LoggerService } from './logger.service';

const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';

@Injectable()
export class BookingPublisher {
  private client: ClientProxy;

  constructor(private readonly logger: LoggerService) {
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
    this.logger.log(`Published BOOKING_CREATED event for correlationId: ${correlationId}`);
  }

  async publishBookingUpdated(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.BOOKING_UPDATED, payload, 'booking-service', correlationId);
    this.client.emit(EVENT_NAMES.BOOKING_UPDATED, event).subscribe();
    this.logger.log(`Published BOOKING_UPDATED event for correlationId: ${correlationId}`);
  }

  async publishBookingCancelled(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.BOOKING_CANCELLED, payload, 'booking-service', correlationId);
    this.client.emit(EVENT_NAMES.BOOKING_CANCELLED, event).subscribe();
    this.logger.log(`Published BOOKING_CANCELLED event for correlationId: ${correlationId}`);
  }
}
