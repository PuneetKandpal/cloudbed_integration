import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { BookingPolicyType, BookingStatus } from '@prisma/client';
import { differenceInHours, parseISO, isBefore } from 'date-fns';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
import { PaymentService } from '../payment/payment.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';

/**
 * Booking Service
 * Core business logic for managing bookings
 * Handles policy evaluation, status updates, and triggers payment workflows
 */
@Injectable()
export class BookingService {
  private readonly logger = new LoggerService('BookingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudbedApi: CloudbedApiService,
    private readonly paymentService: PaymentService,
    private readonly riskService: RiskAssessmentService,
  ) {}

  /**
   * Create booking from Cloudbed webhook
   * Main entry point for new reservations
   */
  async createBookingFromWebhook(payload: any, requestId: string): Promise<void> {
    this.logger.logInfo(
      'Creating booking from webhook',
      'BookingService',
      'createBookingFromWebhook',
      requestId,
      { reservationID: payload.reservationID },
    );

    try {
      // Check if booking already exists
      const existing = await this.prisma.booking.findUnique({
        where: { reservationId: payload.reservationID },
      });

      if (existing) {
        this.logger.logWarn(
          'Booking already exists, skipping creation',
          'BookingService',
          'createBookingFromWebhook',
          requestId,
          { reservationID: payload.reservationID },
        );
        return;
      }

      // Fetch full reservation details from Cloudbed API
      const reservationDetails = await this.cloudbedApi.getReservation(
        payload.reservationID,
        requestId,
      );

      // Determine booking policy type
      const policyType = this.determinePolicyType(reservationDetails);

      // Calculate dates
      const startDate = parseISO(payload.startDate);
      const endDate = parseISO(payload.endDate);
      const now = new Date();
      const isSameDay = differenceInHours(startDate, now) <= 24;

      // Extract cancellation deadline for flexible bookings
      const cancellationDeadline = this.extractCancellationDeadline(reservationDetails);

      // Create booking record
      const booking = await this.prisma.booking.create({
        data: {
          reservationId: payload.reservationID,
          propertyId: payload.propertyID_str || String(payload.propertyID),
          propertyName: reservationDetails.propertyName,
          propertyAddress: reservationDetails.propertyAddress,
          startDate,
          endDate,
          policyType,
          status: BookingStatus.CREATED,
          numberOfGuests: reservationDetails.numberOfGuests || 1,
          totalAmount: reservationDetails.balance || 0,
          paidAmount: 0,
          remainingBalance: reservationDetails.balance || 0,
          currency: reservationDetails.currency || 'USD',
          roomId: payload.subReservations?.[0]?.roomId,
          subReservations: payload.subReservations,
          rawPayload: payload,
          isSameDayCheckIn: isSameDay,
          cancellationDeadline,
        },
      });

      this.logger.logInfo(
        'Successfully created booking',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        { bookingId: booking.id, policyType },
      );

      // Create audit log
      await this.createAuditLog(
        booking.id,
        'Booking created from webhook',
        requestId,
        { payload, booking },
      );

      // Trigger payment workflow based on policy
      await this.triggerPaymentWorkflow(booking, requestId);

    } catch (error) {
      this.logger.logError(
        'Failed to create booking from webhook',
        'BookingService',
        'createBookingFromWebhook',
        error,
        requestId,
        { reservationID: payload.reservationID },
      );
      throw error;
    }
  }

  /**
   * Determine booking policy type from reservation data
   * Analyzes rate plan and special requests for policy identification
   */
  private determinePolicyType(reservationDetails: unknown): BookingPolicyType {
    const details =
      typeof reservationDetails === 'object' && reservationDetails !== null
        ? (reservationDetails as Record<string, unknown>)
        : {};

    const ratePlan =
      typeof details.ratePlan === 'string'
        ? details.ratePlan.toLowerCase()
        : '';
    const specialRequests =
      typeof details.specialRequests === 'string'
        ? details.specialRequests.toLowerCase()
        : '';
    const description =
      typeof details.description === 'string'
        ? details.description.toLowerCase()
        : '';

    const allText = `${ratePlan} ${specialRequests} ${description}`;

    if (
      allText.includes('non-refundable') ||
      allText.includes('nonrefundable')
    ) {
      return BookingPolicyType.NON_REFUNDABLE;
    }

    if (
      allText.includes('flexible') ||
      allText.includes('free cancellation') ||
      allText.includes('cancellation until')
    ) {
      return BookingPolicyType.FLEXIBLE;
    }

    return BookingPolicyType.UNKNOWN;
  }

  /**
   * Extract cancellation deadline from reservation data
   * Parses various formats to find the cancellation deadline
   */
  private extractCancellationDeadline(
    reservationDetails: unknown,
  ): Date | null {
    try {
      const details =
        typeof reservationDetails === 'object' && reservationDetails !== null
          ? (reservationDetails as Record<string, unknown>)
          : {};

      // Check for explicit cancellation date field
      if (typeof details.cancellationDate === 'string') {
        return parseISO(details.cancellationDate);
      }

      // Parse from special requests or description
      const text = `${typeof details.specialRequests === 'string' ? details.specialRequests : ''} ${typeof details.description === 'string' ? details.description : ''}`;

      // Common patterns: "free cancellation until 2026-02-15"
      const datePattern = /cancellation until (\d{4}-\d{2}-\d{2})/i;
      const match = text.match(datePattern);

      if (match) {
        return parseISO(match[1]);
      }

      // If flexible but no date found, assume 2 days before check-in
      if (
        typeof details.ratePlan === 'string' &&
        details.ratePlan.toLowerCase().includes('flexible') &&
        typeof details.startDate === 'string'
      ) {
        const checkInDate = parseISO(details.startDate);
        checkInDate.setDate(checkInDate.getDate() - 2);
        return checkInDate;
      }

      return null;
    } catch (error) {
      this.logger.logError(
        'Failed to extract cancellation deadline',
        'BookingService',
        'extractCancellationDeadline',
        error,
        '',
      );
      return null;
    }
  }

  /**
   * Trigger payment workflow based on booking policy and conditions
   */
  private async triggerPaymentWorkflow(booking: any, requestId: string): Promise<void> {
    this.logger.logInfo(
      'Triggering payment workflow',
      'BookingService',
      'triggerPaymentWorkflow',
      requestId,
      { bookingId: booking.id, policyType: booking.policyType },
    );

    // Perform risk assessment
    await this.riskService.assessBookingRisk(booking.id, requestId);

    if (booking.policyType === BookingPolicyType.NON_REFUNDABLE) {
      // Non-refundable: Charge immediately
      await this.paymentService.processPayment(booking.id, requestId);
    } else if (booking.policyType === BookingPolicyType.FLEXIBLE) {
      // Flexible: Check cancellation deadline
      if (booking.cancellationDeadline) {
        const now = new Date();
        const hoursUntilDeadline = differenceInHours(booking.cancellationDeadline, now);

        if (hoursUntilDeadline <= 0) {
          // Deadline passed, charge immediately
          await this.paymentService.processPayment(booking.id, requestId);
        } else if (hoursUntilDeadline <= 48) {
          // Less than 2 days, send reminder
          // Scheduler will handle this
          this.logger.logInfo(
            'Flexible booking within 2 days of deadline, will send reminders',
            'BookingService',
            'triggerPaymentWorkflow',
            requestId,
            { bookingId: booking.id, hoursUntilDeadline },
          );
        }
      }
    } else if (booking.isSameDayCheckIn) {
      // Same-day check-in: Require payment within 1 hour
      await this.paymentService.processPayment(booking.id, requestId);
    }
  }

  /**
   * Update booking status (e.g., from confirmed to checked_in)
   * Triggers payment on check-in if balance remains
   */
  async updateBookingStatus(
    reservationId: string,
    status: string,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Updating booking status',
      'BookingService',
      'updateBookingStatus',
      requestId,
      { reservationId, status },
    );

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { reservationId },
      });

      if (!booking) {
        this.logger.logWarn(
          'Booking not found for status update',
          'BookingService',
          'updateBookingStatus',
          requestId,
          { reservationId },
        );
        return;
      }

      // Map Cloudbed status to our enum
      const bookingStatus = this.mapStatus(status);

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: bookingStatus },
      });

      // Create audit log
      await this.createAuditLog(
        booking.id,
        `Booking status changed to ${status}`,
        requestId,
        { status, bookingStatus },
      );

      // If checking in, charge remaining balance
      if (status === 'checked_in' && booking.remainingBalance > 0) {
        this.logger.logInfo(
          'Guest checking in with outstanding balance, processing payment',
          'BookingService',
          'updateBookingStatus',
          requestId,
          { bookingId: booking.id, remainingBalance: booking.remainingBalance },
        );
        
        await this.paymentService.processPayment(booking.id, requestId);
      }

      this.logger.logInfo(
        'Successfully updated booking status',
        'BookingService',
        'updateBookingStatus',
        requestId,
        { bookingId: booking.id, status: bookingStatus },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to update booking status',
        'BookingService',
        'updateBookingStatus',
        error,
        requestId,
        { reservationId, status },
      );
      throw error;
    }
  }

  /**
   * Map Cloudbed status strings to our enum
   */
  private mapStatus(status: string): BookingStatus {
    const statusMap: Record<string, BookingStatus> = {
      confirmed: BookingStatus.CONFIRMED,
      checked_in: BookingStatus.CHECKED_IN,
      checked_out: BookingStatus.CHECKED_OUT,
      canceled: BookingStatus.CANCELLED,
      no_show: BookingStatus.NO_SHOW,
    };

    return statusMap[status] || BookingStatus.CONFIRMED;
  }

  /**
   * Update room assignment
   */
  async updateRoomAssignment(
    reservationId: string,
    roomId: string,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Updating room assignment',
      'BookingService',
      'updateRoomAssignment',
      requestId,
      { reservationId, roomId },
    );

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { reservationId },
      });

      if (!booking) {
        this.logger.logWarn(
          'Booking not found for room update',
          'BookingService',
          'updateRoomAssignment',
          requestId,
          { reservationId },
        );
        return;
      }

      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { roomId },
      });

      await this.createAuditLog(
        booking.id,
        'Room assignment updated',
        requestId,
        { roomId },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to update room assignment',
        'BookingService',
        'updateRoomAssignment',
        error,
        requestId,
      );
    }
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(
    bookingId: string,
    message: string,
    requestId: string,
    data?: any,
  ): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          requestId,
          bookingId,
          module: 'BookingService',
          function: 'createAuditLog',
          message,
          level: 'info',
          inputData: data,
        },
      });
    } catch (error) {
      this.logger.logError(
        'Failed to create audit log',
        'BookingService',
        'createAuditLog',
        error,
        requestId,
      );
    }
  }
}
