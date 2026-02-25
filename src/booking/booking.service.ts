import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { BookingPolicyType, BookingStatus } from '@prisma/client';
import { differenceInHours, parseISO, isBefore, addDays } from 'date-fns';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
import { PaymentService } from '../payment/payment.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';
import { CancellationPolicyService } from '../cancellation-policy/cancellation-policy.service';

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
    private readonly cancellationPolicyService: CancellationPolicyService,
  ) { }

  /**
   * Create booking from Cloudbed webhook
   * Main entry point for new reservations
   */
  async createBookingFromWebhook(
    payload: any,
    requestId: string,
  ): Promise<void> {
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

      const reservationRateDetails =
        await this.cloudbedApi.getReservationsWithRateDetails(
          payload.reservationID,
          requestId,
        );

      this.logger.logInfo(
        'Cloudbeds getReservationsWithRateDetails (single source of truth)',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          fullResponse: reservationRateDetails,
        },
      );

      const rateDetailsObj =
        typeof reservationRateDetails === 'object' && reservationRateDetails !== null
          ? (reservationRateDetails as Record<string, any>)
          : {};

      const rawSource = rateDetailsObj?.source;
      const reservationSourceNameRaw =
        typeof rawSource === 'string'
          ? rawSource
          : rawSource?.name ?? rateDetailsObj?.sourceName;
      const reservationSourceName = String(reservationSourceNameRaw ?? '').trim();

      if (reservationSourceName.toLowerCase() !== 'hostelworld') {
        this.logger.logInfo(
          'Skipping booking creation (non-Hostelworld reservation)',
          'BookingService',
          'createBookingFromWebhook',
          requestId,
          {
            reservationID: payload.reservationID,
            reservationSourceName,
            rawSource,
          },
        );
        return;
      }

      const reservationRateDetailsRecord = rateDetailsObj;

      const rooms = Array.isArray((reservationRateDetailsRecord as any)?.rooms)
        ? ((reservationRateDetailsRecord as any).rooms as any[])
        : [];

      const reservationDetailedRoomRateNames = rooms
        .flatMap((r) => {
          const mapObj = r?.detailedRoomRateNames;
          if (typeof mapObj !== 'object' || mapObj === null) {
            return [];
          }
          return Object.values(mapObj as Record<string, unknown>).map((v) =>
            String(v ?? ''),
          );
        })
        .filter(Boolean);

      if (reservationDetailedRoomRateNames.length === 0) {
        this.logger.logWarn(
          'Skipping booking creation (no detailedRoomRateNames in reservation rate details)',
          'BookingService',
          'createBookingFromWebhook',
          requestId,
          {
            reservationID: payload.reservationID,
            sourceName: reservationSourceName,
            roomsCount: rooms.length,
          },
        );
        return;
      }

      const startDateStr = String(rateDetailsObj?.reservationCheckIn ?? '');
      const endDateStr = String(rateDetailsObj?.reservationCheckOut ?? '');
      const startDate = startDateStr ? parseISO(startDateStr) : new Date();
      const endDate = endDateStr ? parseISO(endDateStr) : addDays(startDate, 1);

      this.logger.logInfo(
        'Resolved reservation dates from rate details',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          reservationCheckIn: startDateStr,
          reservationCheckOut: endDateStr,
          startDate,
          endDate,
        },
      );

      const now = new Date();
      const isSameDay = differenceInHours(startDate, now) <= 24;

      const totalAmount = Number(rateDetailsObj?.total ?? 0);
      const remainingBalance = Number(rateDetailsObj?.balance ?? totalAmount);
      const currency = String(rateDetailsObj?.propertyCurrency ?? 'USD');
      const paidFromBalanceDetailed = Number(
        rateDetailsObj?.balanceDetailed?.paid ?? Number.NaN,
      );
      const computedPaid = totalAmount - remainingBalance;
      const paidAmount = Number.isFinite(paidFromBalanceDetailed)
        ? paidFromBalanceDetailed
        : Math.max(computedPaid, 0);

      this.logger.logInfo(
        'Reservation financial data from rate details',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          totalAmount,
          remainingBalance,
          currency,
          paidFromBalanceDetailed,
          computedPaid,
          paidAmount,
        },
      );

      const reservationPlanText =
        `${reservationDetailedRoomRateNames.join(' ')}`
          .toLowerCase()
          .trim();

      this.logger.logInfo(
        'Cloudbeds reservation rate names extracted',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          roomsCount: rooms.length,
          detailedRoomRateNamesCount: reservationDetailedRoomRateNames.length,
          detailedRoomRateNamesSample: reservationDetailedRoomRateNames.slice(
            0,
            5,
          ),
        },
      );

      const hasNonRefundableKeyword =
        reservationPlanText.includes('non-refundable') ||
        reservationPlanText.includes('non refundable') ||
        reservationPlanText.includes('nonrefundable');

      const hasFlexibleKeyword =
        reservationPlanText.includes('flexible') ||
        reservationPlanText.includes('refundable') ||
        reservationPlanText.includes('standard rate');

      const policyTypeFromReservationRateNames = hasNonRefundableKeyword
        ? BookingPolicyType.NON_REFUNDABLE
        : hasFlexibleKeyword
          ? BookingPolicyType.FLEXIBLE
          : BookingPolicyType.FLEXIBLE;

      this.logger.logInfo(
        'Policy derivation (from reservation rate names)',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          reservationPlanText,
          policyTypeFromReservationRateNames,
          matchedTriggers: {
            nonRefundable: hasNonRefundableKeyword,
            flexible: hasFlexibleKeyword,
          },
          defaultedToFlexible: !hasNonRefundableKeyword && !hasFlexibleKeyword,
          reasoning: hasNonRefundableKeyword
            ? 'Rate name contains non-refundable keyword'
            : hasFlexibleKeyword
              ? 'Rate name contains flexible/refundable/standard rate keyword'
              : 'No policy keyword found - defaulting to FLEXIBLE per business rule',
        },
      );

      this.logger.logInfo(
        'Policy derivation (final decision - using rate name)',
        'BookingService',
        'createBookingFromWebhook',
        requestId,
        {
          reservationID: payload.reservationID,
          policyType: policyTypeFromReservationRateNames,
          decisionSource: 'reservation-rate-name-deterministic',
          note: 'Policy derived from rooms[].detailedRoomRateNames only (v1.3 getReservationsWithRateDetails)',
        },
      );

      const policyType = policyTypeFromReservationRateNames;

      let cancellationDeadline: Date | null = null;
      if (policyType === BookingPolicyType.FLEXIBLE) {
        const propertyId = payload.propertyID_str || String(payload.propertyID);
        const policy = await this.cancellationPolicyService.getCancellationPolicy(
          propertyId,
          requestId,
        );
        
        const daysBeforeCheckin = policy.daysBeforeCheckin;
        cancellationDeadline = new Date(startDate);
        cancellationDeadline.setDate(cancellationDeadline.getDate() - daysBeforeCheckin);
        
        this.logger.logInfo(
          'Calculated cancellation deadline for flexible booking',
          'BookingService',
          'createBookingFromWebhook',
          requestId,
          {
            reservationID: payload.reservationID,
            propertyId,
            daysBeforeCheckin,
            startDate,
            cancellationDeadline,
          },
        );
      }

      // Create booking record
      const persistedReservationId = String(payload.reservationID);
      const existingBooking = await this.prisma.booking.findUnique({
        where: { reservationId: persistedReservationId },
      });

      if (existingBooking) {
        this.logger.logInfo(
          'Skipping booking creation (booking already exists for reservationId)',
          'BookingService',
          'createBookingFromWebhook',
          requestId,
          {
            reservationID: payload.reservationID,
            bookingId: existingBooking.id,
            reservationId: existingBooking.reservationId,
          },
        );
        return;
      }

      const booking = await this.prisma.booking.create({
        data: {
          reservationId: persistedReservationId + requestId,
          propertyId: payload.propertyID_str || String(payload.propertyID),
          propertyName: String(rateDetailsObj?.propertyName ?? ''),
          propertyAddress: String(rateDetailsObj?.propertyAddress ?? ''),
          startDate,
          endDate,
          policyType,
          status: BookingStatus.CREATED,
          numberOfGuests: Number(rooms[0]?.adults ?? 1),
          totalAmount,
          paidAmount,
          remainingBalance,
          currency,
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
        {
          payload,
          booking,
          policyDerivedFrom: {
            source: 'reservation-rate-name',
            reservationDetailedRoomRateNames,
            policyType,
          },
        },
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

  private resolveReservationDates(
    payload: any,
    reservationDetails: any,
  ): {
      startDate: Date;
      endDate: Date;
      selectedDateSources: { startDateSource: string; endDateSource: string };
    } {
    const selectDate = (
      candidates: { value?: string; source: string }[],
      fallback: string,
      fallbackSource: string,
    ): { date: Date; source: string } => {
      for (const candidate of candidates) {
        if (candidate.value) {
          return { date: parseISO(String(candidate.value)), source: candidate.source };
        }
      }
      return { date: parseISO(String(fallback)), source: fallbackSource };
    };

    const startCandidate = selectDate(
      [
        { value: reservationDetails?.startDate, source: 'reservationDetails.startDate' },
        {
          value: reservationDetails?.assigned?.[0]?.startDate,
          source: 'reservationDetails.assigned[0].startDate',
        },
      ],
      payload.startDate,
      'payload.startDate',
    );

    const endCandidate = selectDate(
      [
        { value: reservationDetails?.endDate, source: 'reservationDetails.endDate' },
        {
          value: reservationDetails?.assigned?.[0]?.endDate,
          source: 'reservationDetails.assigned[0].endDate',
        },
      ],
      payload.endDate,
      'payload.endDate',
    );

    return {
      startDate: startCandidate.date,
      endDate: endCandidate.date,
      selectedDateSources: {
        startDateSource: startCandidate.source,
        endDateSource: endCandidate.source,
      },
    };
  }

  /**
   * Determine the most reliable reservation total using Cloudbeds priority order.
   * Logs when no finite value can be derived, so downstream consumers know we're falling back later.
   */
  private calculateReservationTotals(
    reservationDetails: any,
    context?: { requestId: string; reservationId: string },
  ): {
    reservationTotal: number;
    debug: Record<string, unknown>;
  } {
    const assignedRoomRates = reservationDetails?.assigned?.[0]?.dailyRates;
    const reservationRoomRateTotal = Array.isArray(assignedRoomRates)
      ? assignedRoomRates.reduce((sum: number, dr: any) => {
        const rate = Number(dr?.rate ?? 0);
        return sum + (Number.isFinite(rate) ? rate : 0);
      }, 0)
      : undefined;

    const reservationTotalFromTotal = Number(reservationDetails?.total);
    const reservationTotalFromGrandTotal = Number(
      reservationDetails?.balanceDetailed?.grandTotal,
    );
    const reservationTotalFromRoomTotal = Number(
      reservationDetails?.assigned?.[0]?.roomTotal,
    );

    const reservationTotal =
      Number(reservationRoomRateTotal) > 0
        ? Number(reservationRoomRateTotal)
        : Number.isFinite(reservationTotalFromTotal)
          ? reservationTotalFromTotal
          : Number.isFinite(reservationTotalFromGrandTotal)
            ? reservationTotalFromGrandTotal
            : Number.isFinite(reservationTotalFromRoomTotal)
              ? reservationTotalFromRoomTotal
              : Number.NaN;

    if (!Number.isFinite(reservationTotal)) {
      this.logger.logWarn(
        'Unable to derive reservation total from Cloudbeds reservation payload',
        'BookingService',
        'calculateReservationTotals',
        context?.requestId ?? '',
        {
          reservationID: context?.reservationId,
          reservationRoomRateTotal,
          reservationTotalFromTotal,
          reservationTotalFromGrandTotal,
          reservationTotalFromRoomTotal,
        },
      );
    }

    return {
      reservationTotal,
      debug: {
        reservationRoomRateTotal,
        reservationTotalFromTotal,
        reservationTotalFromGrandTotal,
        reservationTotalFromRoomTotal,
        reservationTotal,
      },
    };
  }

  private resolveAuthoritativeReservationFields(args: {
    rateDetails: Record<string, any>;
    reservationDetails: any;
    fallbackStartDate: Date;
    fallbackEndDate: Date;
    monetarySnapshot: { reservationTotal: number };
  }): {
    startDate: Date;
    endDate: Date;
    currency: string;
    totalAmount: number;
    remainingBalance: number;
    debug: Record<string, unknown>;
  } {
    const selectDate = (
      candidates: { value?: string; source: string }[],
      fallback: Date,
      fallbackSource: string,
    ): { date: Date; source: string } => {
      for (const candidate of candidates) {
        if (candidate.value) {
          return { date: parseISO(String(candidate.value)), source: candidate.source };
        }
      }
      return { date: fallback, source: fallbackSource };
    };

    const startSelection = selectDate(
      [
        { value: args.rateDetails?.reservationCheckIn, source: 'rateDetails.reservationCheckIn' },
        {
          value: args.rateDetails?.rooms?.[0]?.roomCheckIn,
          source: 'rateDetails.rooms[0].roomCheckIn',
        },
      ],
      args.fallbackStartDate,
      'calculated.startDate',
    );

    const endSelection = selectDate(
      [
        { value: args.rateDetails?.reservationCheckOut, source: 'rateDetails.reservationCheckOut' },
        {
          value: args.rateDetails?.rooms?.[0]?.roomCheckOut,
          source: 'rateDetails.rooms[0].roomCheckOut',
        },
      ],
      args.fallbackEndDate,
      'calculated.endDate',
    );

    const selectNumber = (
      candidates: { value: number; source: string }[],
      fallback: number,
      fallbackSource: string,
      defaultValue: number,
    ): { value: number; source: string } => {
      for (const candidate of candidates) {
        if (Number.isFinite(candidate.value)) {
          return candidate;
        }
      }
      if (Number.isFinite(fallback)) {
        return { value: fallback, source: fallbackSource };
      }
      return { value: defaultValue, source: 'default' };
    };

    const currency = String(
      args.rateDetails?.propertyCurrency ??
        args.reservationDetails?.propertyCurrency ??
        args.reservationDetails?.currency ??
        'USD',
    ).trim() || 'USD';

    const totalSelection = selectNumber(
      [
        { value: Number(args.rateDetails?.total), source: 'rateDetails.total' },
      ],
      args.monetarySnapshot.reservationTotal,
      'calculated.reservationTotal',
      Number(args.reservationDetails?.balance ?? 0),
    );

    const balanceSelection = selectNumber(
      [
        { value: Number(args.rateDetails?.balance), source: 'rateDetails.balance' },
        {
          value: Number(args.reservationDetails?.balanceDetailed?.grandTotal),
          source: 'reservationDetails.balanceDetailed.grandTotal',
        },
      ],
      Number(args.reservationDetails?.balance),
      'reservationDetails.balance',
      0,
    );

    return {
      startDate: startSelection.date,
      endDate: endSelection.date,
      currency,
      totalAmount: totalSelection.value,
      remainingBalance: balanceSelection.value,
      debug: {
        selectedStartDateSource: startSelection.source,
        selectedEndDateSource: endSelection.source,
        selectedCurrency: currency,
        selectedTotalSource: totalSelection.source,
        selectedBalanceSource: balanceSelection.source,
        startDate: startSelection.date,
        endDate: endSelection.date,
        totalAmount: totalSelection.value,
        remainingBalance: balanceSelection.value,
      },
    };
  }

  /**
   * Trigger payment workflow based on booking policy and conditions
   */
  private async triggerPaymentWorkflow(
    booking: any,
    requestId: string,
  ): Promise<void> {
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

      this.logger.logInfo("Non-refundable policy detected, charging immediately", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
      // Non-refundable: Charge immediately
      await this.paymentService.processPayment(booking.id, requestId);
    } else if (booking.policyType === BookingPolicyType.FLEXIBLE) {

      this.logger.logInfo("Flexible policy detected, checking cancellation deadline", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
      // Flexible: Check cancellation deadline
      if (booking.cancellationDeadline) {
        const now = new Date();
        const hoursUntilDeadline = differenceInHours(
          booking.cancellationDeadline,
          now,
        );

        this.logger.logInfo("checking cancellation deadline", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, hoursUntilDeadline });

        if (hoursUntilDeadline <= 0) {
          this.logger.logInfo("Deadline passed, charge immediately", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, hoursUntilDeadline });
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
      this.logger.logInfo("Same-day check-in: Require payment within 1 hour", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
      await this.paymentService.processPayment(booking.id, requestId);
    }else{
      this.logger.logInfo("No action required", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, booking });
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
      const remainingBalance = booking.remainingBalance.toNumber();

      if (status === 'checked_in' && remainingBalance > 0) {
        this.logger.logInfo(
          'Guest checking in with outstanding balance, processing payment',
          'BookingService',
          'updateBookingStatus',
          requestId,
          { bookingId: booking.id, remainingBalance },
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
