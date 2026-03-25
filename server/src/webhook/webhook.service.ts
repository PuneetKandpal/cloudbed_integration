import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { BookingService } from '../booking/booking.service';

/**
 * Webhook Service
 * Processes incoming Cloudbed webhook events
 * Routes events to appropriate domain services
 */
@Injectable()
export class WebhookService {
  private readonly logger = new LoggerService('WebhookService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingService: BookingService,
  ) {}

  /**
   * Main webhook processing logic
   * Routes events based on event type
   */
  async processWebhook(
    payload: any,
    headers: any,
    requestId: string,
  ): Promise<void> {
    const eventType = payload?.event || 'unknown';
    const reservationId =
      payload?.reservationID ||
      payload?.reservationId ||
      payload?.subReservations?.[0]?.id;

    this.logger.logInfo(
      'Processing webhook event',
      'WebhookService',
      'processWebhook',
      requestId,
      { event: eventType, payload },
    );

    // Store raw webhook in WebhookEvent table
    let webhookEventId: string | undefined;
    try {
      const event = await this.prisma.webhookEvent.create({
        data: {
          eventType,
          eventId: requestId, // using requestId as correlation id
          reservationId: reservationId ? String(reservationId) : null,
          propertyId: payload?.propertyID_str || payload?.propertyId_str,
          payload: payload || {},
          headers: headers || {},
          source: 'CLOUDBED_WEBHOOK',
        },
      });
      webhookEventId = event.id;
    } catch (dbError) {
      this.logger.logError(
        'Failed to save webhook event to database',
        'WebhookService',
        'processWebhook',
        dbError,
        requestId,
      );
    }

    // Also store raw webhook in audit log for backward compatibility
    await this.createAuditLog(payload, headers, requestId);

    switch (eventType) {
      case 'reservation/created':
        await this.handleReservationCreated(payload, requestId);
        break;

      case 'reservation/status_changed':
        await this.handleReservationStatusChanged(payload, requestId);
        break;

      case 'reservation/accommodation_status_changed':
        await this.handleAccommodationStatusChanged(payload, requestId);
        break;

      case 'reservation/accommodation_changed':
        await this.handleAccommodationChanged(payload, requestId);
        break;

      case 'guest/created':
        await this.handleGuestCreated(payload, requestId);
        break;

      case 'guest/updated':
        await this.handleGuestUpdated(payload, requestId);
        break;

      case 'reservation/deleted':
        await this.handleReservationDeleted(payload, requestId);
        break;

      default:
        this.logger.logWarn(
          `Unknown webhook event type: ${eventType}`,
          'WebhookService',
          'processWebhook',
          requestId,
          { eventType, payload },
        );
    }

    // Mark webhook event as processed
    if (webhookEventId) {
      try {
        await this.prisma.webhookEvent.update({
          where: { id: webhookEventId },
          data: {
            processed: true,
            processedAt: new Date(),
          },
        });
      } catch (dbError) {
        this.logger.logError(
          'Failed to mark webhook event as processed',
          'WebhookService',
          'processWebhook',
          dbError,
          requestId,
          { webhookEventId },
        );
      }
    }
  }

  /**
   * Handle reservation created event
   * This is the main trigger for the payment automation workflow
   */
  private async handleReservationCreated(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling reservation created event',
      'WebhookService',
      'handleReservationCreated',
      requestId,
      { reservationID: payload.reservationID },
    );

    try {
      await this.bookingService.createBookingFromWebhook(payload, requestId);

      this.logger.logInfo(
        'Successfully handled reservation created event',
        'WebhookService',
        'handleReservationCreated',
        requestId,
        { reservationID: payload.reservationID },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to handle reservation created event',
        'WebhookService',
        'handleReservationCreated',
        error,
        requestId,
        { reservationID: payload.reservationID },
      );
      throw error;
    }
  }

  /**
   * Handle reservation status changed event
   * Triggers payment on check-in
   */
  private async handleReservationStatusChanged(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling reservation status changed event',
      'WebhookService',
      'handleReservationStatusChanged',
      requestId,
      {
        reservationID: payload.reservationID,
        status: payload.status,
        previousStatus: payload.previousStatus,
      },
    );

    try {
      await this.bookingService.updateBookingStatus(
        payload.reservationID,
        payload.status,
        requestId,
      );

      this.logger.logInfo(
        'Successfully handled reservation status changed event',
        'WebhookService',
        'handleReservationStatusChanged',
        requestId,
        { reservationID: payload.reservationID },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to handle reservation status changed event',
        'WebhookService',
        'handleReservationStatusChanged',
        error,
        requestId,
        { reservationID: payload.reservationID },
      );
    }
  }

  /**
   * Handle accommodation status changed event
   */
  private async handleAccommodationStatusChanged(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling accommodation status changed event',
      'WebhookService',
      'handleAccommodationStatusChanged',
      requestId,
      {
        reservationId: payload.reservationId,
        status: payload.status,
        roomId: payload.roomId,
      },
    );

    try {
      await this.bookingService.updateRoomAssignment(
        payload.reservationId,
        payload.roomId,
        requestId,
      );
    } catch (error) {
      this.logger.logError(
        'Failed to handle accommodation status changed',
        'WebhookService',
        'handleAccommodationStatusChanged',
        error,
        requestId,
      );
    }
  }

  /**
   * Handle accommodation changed event
   */
  private async handleAccommodationChanged(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling accommodation changed event',
      'WebhookService',
      'handleAccommodationChanged',
      requestId,
      {
        reservationId: payload.reservationId,
        roomId: payload.roomId,
        roomIdPrev: payload.roomIdPrev,
      },
    );

    try {
      await this.bookingService.updateRoomAssignment(
        payload.reservationId,
        payload.roomId,
        requestId,
      );
    } catch (error) {
      this.logger.logError(
        'Failed to handle accommodation changed',
        'WebhookService',
        'handleAccommodationChanged',
        error,
        requestId,
      );
    }
  }

  /**
   * Handle guest created event
   */
  private async handleGuestCreated(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling guest created event',
      'WebhookService',
      'handleGuestCreated',
      requestId,
      { guestId: payload.guestId },
    );

    // Guest details will be fetched via API when needed
    // Just log the event for now
  }

  /**
   * Handle guest updated event
   */
  private async handleGuestUpdated(
    payload: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Handling guest updated event',
      'WebhookService',
      'handleGuestUpdated',
      requestId,
      { guestId: payload.guestId },
    );

    // Guest details will be fetched via API when needed
  }

  /**
   * Handle reservation deleted event
   */
  private async handleReservationDeleted(
    payload: any,
    requestId: string,
  ): Promise<void> {
    const reservationId = payload?.reservationId || payload?.reservationID;
    
    this.logger.logInfo(
      'Handling reservation deleted event',
      'WebhookService',
      'handleReservationDeleted',
      requestId,
      { reservationId },
    );

    try {
      // Update booking status to DELETED and set deletion timestamp
      const updatedBooking = await this.prisma.booking.updateMany({
        where: { 
          reservationId: String(reservationId) 
        },
        data: {
          status: 'DELETED',
          deletedAt: new Date(),
          deletionReason: 'Deleted via Cloudbeds webhook',
        },
      });

      if (updatedBooking.count > 0) {
        this.logger.logInfo(
          'Successfully marked booking as deleted',
          'WebhookService',
          'handleReservationDeleted',
          requestId,
          { 
            reservationId, 
            bookingsUpdated: updatedBooking.count 
          },
        );
      } else {
        this.logger.logWarn(
          'No booking found to mark as deleted',
          'WebhookService',
          'handleReservationDeleted',
          requestId,
          { reservationId },
        );
      }
    } catch (error) {
      this.logger.logError(
        'Failed to handle reservation deleted event',
        'WebhookService',
        'handleReservationDeleted',
        error,
        requestId,
        { reservationId },
      );
    }
  }

  /**
   * Create audit log entry for webhook event
   */
  private async createAuditLog(
    payload: any,
    headers: any,
    requestId: string,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          requestId,
          module: 'WebhookService',
          function: 'processWebhook',
          message: `Received webhook event: ${payload?.event}`,
          level: 'info',
          inputData: {
            payload,
            headers,
          },
        },
      });
    } catch (error) {
      this.logger.logError(
        'Failed to create audit log',
        'WebhookService',
        'createAuditLog',
        error,
        requestId,
      );
    }
  }
}
