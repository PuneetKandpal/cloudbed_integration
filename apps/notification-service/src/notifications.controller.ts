import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

/**
 * Optional HTTP API for sending notifications (e.g. admin triggers).
 * Primary flow is event-driven via ConsumerService.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // TODO: POST /send with body { channel, userId, subject?, body, metadata? }
}
