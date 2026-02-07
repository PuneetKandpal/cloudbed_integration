import { Injectable } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';
import { EVENT_NAMES } from '@hostelworld/common';
import { createBaseEvent } from '@hostelworld/shared-events';
import { AppLogger } from '@hostelworld/common';

const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';

/**
 * Emits notification sent/failed events to RabbitMQ.
 */
@Injectable()
export class ProducerService {
  private client: ClientProxy;

  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(ProducerService.name);
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: [RABBITMQ_URI],
        queue: 'notification_events',
        queueOptions: { durable: true },
      },
    });
  }

  async publishNotificationSent(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.NOTIFICATION_SENT, payload, 'notification-service', correlationId);
    this.client.emit(EVENT_NAMES.NOTIFICATION_SENT, event).subscribe();
  }

  async publishNotificationFailed(payload: unknown, correlationId?: string): Promise<void> {
    const event = createBaseEvent(EVENT_NAMES.NOTIFICATION_FAILED, payload, 'notification-service', correlationId);
    this.client.emit(EVENT_NAMES.NOTIFICATION_FAILED, event).subscribe();
  }
}
