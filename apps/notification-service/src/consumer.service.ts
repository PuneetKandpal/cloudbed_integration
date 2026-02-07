import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AppLogger } from '@hostelworld/common';
import { EVENT_NAMES } from '@hostelworld/common';
import { NotificationsService } from './notifications.service';

/**
 * RabbitMQ consumer for notification-service.
 * Listens for NOTIFICATION_REQUESTED and delegates to NotificationsService.
 */
@Controller()
export class ConsumerService {
  constructor(
    private readonly logger: AppLogger,
    private readonly notificationsService: NotificationsService,
  ) {
    this.logger.setContext(ConsumerService.name);
  }

  @EventPattern(EVENT_NAMES.NOTIFICATION_REQUESTED)
  async handleNotificationRequested(@Payload() payload: unknown) {
    // TODO: Parse payload, call notificationsService.send(payload), publish NOTIFICATION_SENT / NOTIFICATION_FAILED
    this.logger.log('Notification requested (placeholder)', (payload as { correlationId?: string })?.correlationId);
  }
}
