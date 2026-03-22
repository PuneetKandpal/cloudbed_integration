import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { LoggerService } from '../common/logger/logger.service';

/**
 * Webhook Controller
 * Handles incoming webhook events from Cloudbed
 * Processes reservation creation, status changes, guest updates, etc.
 */
@Controller('cloudbeds/webhook')
export class WebhookController {
  private readonly logger = new LoggerService('WebhookController');

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * Main webhook endpoint for Cloudbed events
   * Receives all webhook events and routes them to appropriate handlers
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any, @Headers() headers: any) {
    const requestId = this.logger.generateRequestId();

    this.logger.logInfo(
      'Received Cloudbed webhook event',
      'WebhookController',
      'handleWebhook',
      requestId,
      {
        event: payload?.event,
        reservationID: payload?.reservationID || payload?.reservationId,
        propertyID: payload?.propertyID,
      },
    );

    try {
      await this.webhookService.processWebhook(payload, headers, requestId);

      this.logger.logInfo(
        'Successfully processed webhook event',
        'WebhookController',
        'handleWebhook',
        requestId,
        { event: payload?.event },
      );

      return {
        status: 'success',
        message: 'Webhook processed successfully',
        requestId,
      };
    } catch (error) {
      this.logger.logError(
        'Failed to process webhook event',
        'WebhookController',
        'handleWebhook',
        error,
        requestId,
        { event: payload?.event },
      );

      return {
        status: 'error',
        message: 'Failed to process webhook',
        requestId,
      };
    }
  }
}
