import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from '../email/email.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';
import { BookingStatus, BookingPolicyType, EmailStatus, EmailType, PaymentStatus, RiskLevel } from '@prisma/client';
import { addHours, differenceInCalendarDays, differenceInMinutes, format, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { OccupancyService } from '../occupancy/occupancy.service';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';

/**
 * Scheduler Service
 * Manages automated workflows for booking monitoring, payment processing, and notifications
 * Implements the business logic defined in the Scope of Work document
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new LoggerService('SchedulerService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly emailService: EmailService,
    private readonly riskService: RiskAssessmentService,
    private readonly occupancyService: OccupancyService,
    private readonly cloudbedApi: CloudbedApiService,
  ) {}

  private async resolvePropertyTimeZone(propertyId?: string): Promise<string> {
    const rawPropertyId = String(propertyId ?? '').trim();
    if (rawPropertyId) {
      try {
        const record = await this.prisma.propertyTimeZone.findUnique({
          where: { propertyId: rawPropertyId },
        });
        const fromDb = String(record?.timeZone ?? '').trim();
        if (fromDb) {
          return fromDb;
        }
      } catch (error) {
        this.logger.logWarn(
          'Failed to resolve property timezone from DB; falling back to env/default',
          'SchedulerService',
          'resolvePropertyTimeZone',
          this.logger.generateRequestId(),
          { propertyId: rawPropertyId, error },
        );
      }
    }

    const byPropertyKey = rawPropertyId
      ? process.env[`PROPERTY_TIMEZONE_${rawPropertyId}`]
      : undefined;
    const tz = String(
      byPropertyKey ?? process.env.PROPERTY_TIMEZONE_DEFAULT ?? 'UTC',
    ).trim();
    return tz || 'UTC';
  }

  /**
   * Monitor flexible bookings and trigger payment workflows
   * Runs every hour to check if flexible bookings have passed their cancellation deadline
   */
  @Cron(CronExpression.EVERY_HOUR)
  async monitorFlexibleBookings(): Promise<void> {
    const requestId = `scheduler-flexible-${Date.now()}`;
    
    this.logger.logInfo(
      'Starting flexible bookings monitoring job',
      'SchedulerService',
      'monitorFlexibleBookings',
      requestId,
      {},
    );

    try {
      const now = new Date();
      
      // Find flexible bookings where cancellation deadline has passed but payment not complete
      const flexibleBookings = await this.prisma.booking.findMany({
        where: {
          policyType: BookingPolicyType.FLEXIBLE,
          status: BookingStatus.CREATED,
          cancellationDeadline: {
            lte: now, // Deadline has passed
          },
          remainingBalance: {
            gt: 0, // Still has outstanding balance
          },
          payments: {
            none: {},
          },
        },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          riskAssessments: {
            orderBy: { assessedAt: 'desc' },
            take: 1,
          },
        },
      });

      this.logger.logInfo(
        'Found flexible bookings past cancellation deadline',
        'SchedulerService',
        'monitorFlexibleBookings',
        requestId,
        { count: flexibleBookings.length },
      );

      for (const booking of flexibleBookings) {
        await this.processFlexibleBookingPayment(booking, requestId);
      }

      this.logger.logInfo(
        'Completed flexible bookings monitoring job',
        'SchedulerService',
        'monitorFlexibleBookings',
        requestId,
        { processedCount: flexibleBookings.length },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to monitor flexible bookings',
        'SchedulerService',
        'monitorFlexibleBookings',
        error,
        requestId,
      );
    }
  }

  /**
   * Process non-refundable bookings immediately upon creation
   * Runs every 30 minutes to catch any that were missed
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async processNonRefundableBookings(): Promise<void> {
    const requestId = `scheduler-nonrefundable-${Date.now()}`;
    
    this.logger.logInfo(
      'Starting non-refundable bookings processing job',
      'SchedulerService',
      'processNonRefundableBookings',
      requestId,
      {},
    );

    try {
      // Find non-refundable bookings that haven't had payment attempted yet
      const nonRefundableBookings = await this.prisma.booking.findMany({
        where: {
          policyType: BookingPolicyType.NON_REFUNDABLE,
          status: BookingStatus.CREATED,
          remainingBalance: {
            gt: 0,
          },
          payments: {
            none: {}, // No payment attempts yet
          },
        },
        include: {
          riskAssessments: {
            orderBy: { assessedAt: 'desc' },
            take: 1,
          },
        },
      });

      this.logger.logInfo(
        'Found non-refundable bookings requiring payment',
        'SchedulerService',
        'processNonRefundableBookings',
        requestId,
        { count: nonRefundableBookings.length },
      );

      for (const booking of nonRefundableBookings) {
        await this.initiatePaymentWorkflow(booking, requestId);
      }

      this.logger.logInfo(
        'Completed non-refundable bookings processing job',
        'SchedulerService',
        'processNonRefundableBookings',
        requestId,
        { processedCount: nonRefundableBookings.length },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to process non-refundable bookings',
        'SchedulerService',
        'processNonRefundableBookings',
        error,
        requestId,
      );
    }
  }

  /**
   * Process failed worker payments by sending payment links to guests
   *
   * NEW FLOW (worker-first, then payment-link fallback):
   * 1. Worker attempts charge once (via initiatePaymentWorkflow / authorizePayment).
   * 2. If worker fails → send payment link to guest (NO second worker attempt).
   * 3. If still unpaid → resend payment link on risk-based schedule:
   *    - HIGH / CRITICAL risk: resend after 2 hours
   *    - LOW / MEDIUM risk: resend after 24 hours
   * 4. After configured failure threshold → notify admin about problematic booking.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processPaymentRetries(): Promise<void> {
    const requestId = `scheduler-retries-${Date.now()}`;
    
    this.logger.logInfo(
      'Starting payment-link follow-up job (post-worker-failure)',
      'SchedulerService',
      'processPaymentRetries',
      requestId,
      {},
    );

    try {
      const now = new Date();
      
      // Find bookings where worker has FAILED and balance is still outstanding
      const bookingsWithFailedPayment = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CREATED,
          remainingBalance: {
            gt: 0,
          },
          payments: {
            some: {
              status: PaymentStatus.FAILED,
            },
          },
        },
        include: {
          payments: {
            where: { status: PaymentStatus.FAILED },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          riskAssessments: {
            orderBy: { assessedAt: 'desc' },
            take: 1,
          },
          emails: {
            where: {
              emailType: EmailType.PAYMENT_LINK,
              status: EmailStatus.SENT,
            },
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
      });

      this.logger.logInfo(
        'Found bookings with failed worker payments',
        'SchedulerService',
        'processPaymentRetries',
        requestId,
        { count: bookingsWithFailedPayment.length },
      );

      let paymentLinksSent = 0;
      let adminNotifications = 0;
      let skippedCount = 0;

      for (const booking of bookingsWithFailedPayment) {
        const lastFailedPayment = booking.payments[0];
        const riskAssessment = booking.riskAssessments[0];
        const lastPaymentLinkEmail = (booking as any).emails?.[0] as
          | { sentAt: Date | null; createdAt: Date }
          | undefined;

        if (!lastFailedPayment) {
          this.logger.logWarn(
            'Skipping booking without failed payment record',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            { bookingId: booking.id },
          );
          continue;
        }

        const isRisky =
          riskAssessment?.riskLevel === RiskLevel.HIGH ||
          riskAssessment?.riskLevel === RiskLevel.CRITICAL;

        // Determine how many PAYMENT_LINK emails have already been sent for this booking
        const paymentLinkEmailCount = await this.prisma.email.count({
          where: {
            bookingId: booking.id,
            emailType: EmailType.PAYMENT_LINK,
            status: EmailStatus.SENT,
          },
        });

        this.logger.logInfo(
          'Evaluating booking for payment-link send / admin escalation',
          'SchedulerService',
          'processPaymentRetries',
          requestId,
          {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            isRisky,
            riskLevel: riskAssessment?.riskLevel ?? 'NONE',
            paymentLinkEmailCount,
            lastPaymentLinkSentAt: lastPaymentLinkEmail?.sentAt ?? null,
            escalatedAt: booking.escalatedAt,
          },
        );

        // --- Check if we've hit the admin-notification threshold ---
        const settings = await this.getPropertyNotificationSetting(booking.propertyId);
        const adminThreshold = settings?.cancelRequestAfterFailures ?? 2;

        // Total payment attempts (worker failures) count towards admin threshold
        const totalPaymentAttempts = await this.prisma.payment.count({
          where: { bookingId: booking.id },
        });

        if (totalPaymentAttempts >= adminThreshold && paymentLinkEmailCount >= adminThreshold) {
          this.logger.logInfo(
            'Admin notification threshold reached — notifying admin about problematic booking',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              reservationId: booking.reservationId,
              totalPaymentAttempts,
              paymentLinkEmailCount,
              adminThreshold,
            },
          );

          await this.requestAdminCancellationIfThresholdReached(
            booking.id,
            paymentLinkEmailCount,
            requestId,
          );
          adminNotifications++;
          continue;
        }

        // --- Determine whether it's time to send / resend a payment link ---
        const resendThresholdMinutes = isRisky ? 120 : 1440; // 2h vs 24h

        if (paymentLinkEmailCount === 0) {
          // First payment link — send immediately after worker failure
          this.logger.logInfo(
            'Worker failed; sending first payment link to guest',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              reservationId: booking.reservationId,
            },
          );

          await this.sendPaymentLinkToGuest(booking, riskAssessment, requestId);
          paymentLinksSent++;
        } else {
          // Resend logic: check time elapsed since last payment link email
          const lastSentAt = lastPaymentLinkEmail?.sentAt ?? lastPaymentLinkEmail?.createdAt;
          const minutesSinceLastLink = lastSentAt
            ? differenceInMinutes(now, lastSentAt)
            : Infinity;

          if (minutesSinceLastLink >= resendThresholdMinutes) {
            this.logger.logInfo(
              'Resending payment link — enough time has elapsed',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              {
                bookingId: booking.id,
                reservationId: booking.reservationId,
                minutesSinceLastLink,
                resendThresholdMinutes,
                isRisky,
                paymentLinkEmailCount,
              },
            );

            await this.sendPaymentLinkToGuest(booking, riskAssessment, requestId);
            paymentLinksSent++;
          } else {
            this.logger.logInfo(
              'Skipping resend — not enough time elapsed since last payment link',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              {
                bookingId: booking.id,
                minutesSinceLastLink,
                resendThresholdMinutes,
                nextResendInMinutes: resendThresholdMinutes - minutesSinceLastLink,
              },
            );
            skippedCount++;
          }
        }
      }

      this.logger.logInfo(
        'Completed payment-link follow-up job — Summary',
        'SchedulerService',
        'processPaymentRetries',
        requestId,
        {
          totalBookings: bookingsWithFailedPayment.length,
          paymentLinksSent,
          adminNotifications,
          skipped: skippedCount,
        },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to process payment-link follow-ups',
        'SchedulerService',
        'processPaymentRetries',
        error,
        requestId,
      );
    }
  }

  /**
   * Send payment reminders for upcoming bookings
   * Sends reminders 48 hours before check-in if payment pending
   */
  @Cron(CronExpression.EVERY_12_HOURS)
  async sendPaymentReminders(): Promise<void> {
    const requestId = `scheduler-reminders-${Date.now()}`;
    
    this.logger.logInfo(
      'Starting payment reminders job',
      'SchedulerService',
      'sendPaymentReminders',
      requestId,
      {},
    );

    try {
      const now = new Date();
      const reminderWindow = addHours(now, 72);
      
      // Find bookings with check-in within 48 hours and outstanding balance
      const bookingsNeedingReminder = await this.prisma.booking.findMany({
        where: {
          status: BookingStatus.CREATED,
          startDate: {
            gte: now,
            lte: reminderWindow,
          },
          remainingBalance: {
            gt: 0,
          },
          guestEmail: {
            not: null,
          },
        },
      });

      this.logger.logInfo(
        'Found bookings needing payment reminders',
        'SchedulerService',
        'sendPaymentReminders',
        requestId,
        { count: bookingsNeedingReminder.length },
      );

      for (const booking of bookingsNeedingReminder) {
        if (!booking.guestEmail) continue;

        const propertyTimeZone = await this.resolvePropertyTimeZone(booking.propertyId);
        const nowLocalDateOnly = formatInTimeZone(now, propertyTimeZone, 'yyyy-MM-dd');
        const checkInLocalDateOnly = formatInTimeZone(
          booking.startDate,
          propertyTimeZone,
          'yyyy-MM-dd',
        );

        const daysUntilCheckIn = differenceInCalendarDays(
          parseISO(checkInLocalDateOnly),
          parseISO(nowLocalDateOnly),
        );

        if (daysUntilCheckIn < 0 || daysUntilCheckIn > 2) {
          continue;
        }

        try {
          await this.emailService.sendPaymentReminder(
            booking.id,
            {
              guestEmail: booking.guestEmail,
              reservationId: booking.reservationId,
              propertyName: booking.propertyName || 'Property',
              startDate: booking.startDate,
              endDate: booking.endDate,
              totalAmount: booking.totalAmount.toNumber(),
              currency: booking.currency,
              cancellationDeadline: booking.parsedCancellationDeadline || booking.cancellationDeadline || undefined,
            },
            requestId,
          );

          this.logger.logInfo(
            'Sent payment reminder',
            'SchedulerService',
            'sendPaymentReminders',
            requestId,
            { bookingId: booking.id, reservationId: booking.reservationId },
          );
        } catch (error) {
          this.logger.logError(
            'Failed to send payment reminder',
            'SchedulerService',
            'sendPaymentReminders',
            error,
            requestId,
            { bookingId: booking.id },
          );
        }
      }

      this.logger.logInfo(
        'Completed payment reminders job',
        'SchedulerService',
        'sendPaymentReminders',
        requestId,
      );
    } catch (error) {
      this.logger.logError(
        'Failed to send payment reminders',
        'SchedulerService',
        'sendPaymentReminders',
        error,
        requestId,
      );
    }
  }

  /**
   * Process flexible booking payment workflow
   */
  private async processFlexibleBookingPayment(
    booking: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Processing flexible booking payment (deadline passed)',
      'SchedulerService',
      'processFlexibleBookingPayment',
      requestId,
      {
        bookingId: booking.id,
        reservationId: booking.reservationId,
        cancellationDeadline: booking.cancellationDeadline,
      },
    );

    // Assess risk if not already done
    if (!booking.riskAssessments || booking.riskAssessments.length === 0) {
      await this.riskService.assessBookingRisk(booking.id, requestId);
    }

    // Initiate payment workflow
    await this.initiatePaymentWorkflow(booking, requestId);
  }

  /**
   * Initiate payment authorization workflow
   */
  private async initiatePaymentWorkflow(
    booking: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Initiating payment workflow',
      'SchedulerService',
      'initiatePaymentWorkflow',
      requestId,
      { bookingId: booking.id, reservationId: booking.reservationId },
    );

    try {
      // Attempt payment authorization
      const paymentResult = await this.paymentService.authorizePayment(
        booking.id,
        booking.remainingBalance.toNumber(),
        requestId,
      );

      if (paymentResult.success) {
        this.logger.logInfo(
          'Payment authorization Queued successfully',
          'SchedulerService',
          'initiatePaymentWorkflow',
          requestId,
          { bookingId: booking.id },
        );
      }
    } catch (error) {
      this.logger.logError(
        'Failed to initiate payment workflow',
        'SchedulerService',
        'initiatePaymentWorkflow',
        error,
        requestId,
        { bookingId: booking.id },
      );
    }
  }

  /**
   * Send (or resend) a payment link to the guest after worker charge failure.
   * Does NOT re-attempt worker charge — only generates a Cloudbeds payment link
   * and emails it to the guest.
   */
  private async sendPaymentLinkToGuest(
    booking: any,
    riskAssessment: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Generating and sending payment link to guest (worker failed)',
      'SchedulerService',
      'sendPaymentLinkToGuest',
      requestId,
      {
        bookingId: booking.id,
        reservationId: booking.reservationId,
        riskLevel: riskAssessment?.riskLevel ?? 'NONE',
      },
    );

    try {
      // Ensure risk assessment exists
      if (!riskAssessment) {
        await this.riskService.assessBookingRisk(booking.id, requestId);
      }

      // Generate payment link via Cloudbeds API
      const paymentLink = await this.cloudbedApi.generatePaymentLink(
        { reservationId: booking.reservationId, propertyId: booking.propertyId },
        requestId,
      );

      this.logger.logInfo(
        'Payment link generated',
        'SchedulerService',
        'sendPaymentLinkToGuest',
        requestId,
        { bookingId: booking.id, paymentLinkGenerated: !!paymentLink },
      );

      if (booking.guestEmail) {
        await this.emailService.sendPaymentLink(
          booking.id,
          booking.guestEmail,
          paymentLink,
          requestId,
        );

        this.logger.logInfo(
          'Payment link email sent to guest',
          'SchedulerService',
          'sendPaymentLinkToGuest',
          requestId,
          { bookingId: booking.id, guestEmail: booking.guestEmail },
        );
      } else {
        this.logger.logWarn(
          'No guest email available — cannot send payment link; notifying support instead',
          'SchedulerService',
          'sendPaymentLinkToGuest',
          requestId,
          { bookingId: booking.id },
        );
      }

      // Mark booking as escalated on first payment-link send
      if (!booking.escalatedAt) {
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { escalatedAt: new Date() },
        });
      }

      // Notify support about the failed worker charge + payment link sent
      const latestRisk = await this.prisma.riskAssessment.findFirst({
        where: { bookingId: booking.id },
        orderBy: { assessedAt: 'desc' },
      });

      try {
        await this.emailService.sendSupportNotification(
          booking.id,
          {
            guestEmail: booking.guestEmail || 'unknown',
            guestName: undefined,
            reservationId: booking.reservationId,
            propertyName: booking.propertyName || 'Property',
            startDate: booking.startDate,
            riskLevel: latestRisk?.riskLevel ?? 'UNKNOWN',
            totalAmount: booking.totalAmount.toNumber(),
            currency: booking.currency,
          },
          requestId,
        );
      } catch (supportError) {
        this.logger.logWarn(
          'Failed to send support notification after payment link',
          'SchedulerService',
          'sendPaymentLinkToGuest',
          requestId,
          { bookingId: booking.id, error: String(supportError) },
        );
      }
    } catch (error) {
      this.logger.logError(
        'Failed to send payment link to guest',
        'SchedulerService',
        'sendPaymentLinkToGuest',
        error,
        requestId,
        { bookingId: booking.id },
      );
    }
  }

  /**
   * Public wrapper — manually trigger a payment-link email for a booking.
   * Used by the controller endpoint for manual/testing purposes.
   */
  async sendPaymentLinkForBooking(
    bookingId: string,
    requestId: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
      },
    });

    if (!booking) {
      return { sent: false, reason: 'Booking not found' };
    }

    if (!booking.guestEmail) {
      return { sent: false, reason: 'No guest email on booking' };
    }

    await this.sendPaymentLinkToGuest(booking, booking.riskAssessments[0], requestId);
    return { sent: true };
  }

  /**
   * Escalate failed payment to manager for approval
   */
  async requestAdminCancellationForBooking(
    bookingId: string,
    requestId: string,
    options?: { force?: boolean },
  ): Promise<{ sent: boolean; recipients: string[]; reason?: string }> {
    // This method sends an email asking admin/support staff to cancel the reservation in Cloudbeds.
    // We intentionally do NOT auto-cancel reservations from this service.

    this.logger.logInfo(
      'Preparing admin cancellation request email',
      'SchedulerService',
      'requestAdminCancellationForBooking',
      requestId,
      { bookingId, force: Boolean(options?.force) },
    );

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) {
      this.logger.logWarn(
        'Booking not found; cannot send admin cancellation request',
        'SchedulerService',
        'requestAdminCancellationForBooking',
        requestId,
        { bookingId },
      );
      return { sent: false, recipients: [], reason: 'Booking not found' };
    }

    // booking.startDate is captured from Cloudbeds reservationCheckIn (see BookingService.createBookingFromWebhook).
    // We treat it as the check-in date for occupancy snapshot purposes.
    const propertyTimeZone = await this.resolvePropertyTimeZone(booking.propertyId);
    const checkinDate = formatInTimeZone(
      new Date(booking.startDate),
      propertyTimeZone,
      'yyyy-MM-dd',
    );

    this.logger.logInfo(
      'Resolved check-in date for cancellation request flow',
      'SchedulerService',
      'requestAdminCancellationForBooking',
      requestId,
      {
        bookingId,
        reservationId: booking.reservationId,
        startDate: booking.startDate,
        checkinDate,
      },
    );

    const alreadySent = await this.prisma.email.findFirst({
      where: {
        bookingId,
        emailType: EmailType.ADMIN_CANCELLATION_REQUEST,
        status: { in: [EmailStatus.PENDING, EmailStatus.SENT] },
      },
      select: { id: true },
    });

    if (alreadySent && !options?.force) {
      this.logger.logInfo(
        'Admin cancellation request already sent; skipping',
        'SchedulerService',
        'requestAdminCancellationForBooking',
        requestId,
        { bookingId, alreadySentEmailId: alreadySent.id },
      );
      return { sent: false, recipients: [], reason: 'Already requested' };
    }

    const settings = await this.getPropertyNotificationSetting(booking.propertyId);
    const recipients = this.mergeRecipients(settings?.adminEmails, settings?.supportEmails);

    this.logger.logInfo(
      'Resolved admin/support recipients for cancellation request',
      'SchedulerService',
      'requestAdminCancellationForBooking',
      requestId,
      {
        bookingId,
        propertyId: booking.propertyId,
        recipientsCount: recipients.length,
        recipients,
        configuredThreshold: settings?.cancelRequestAfterFailures ?? null,
      },
    );

    if (recipients.length === 0) {
      this.logger.logWarn(
        'No admin/support recipients configured; skipping admin cancellation request email',
        'SchedulerService',
        'requestAdminCancellationForBooking',
        requestId,
        { bookingId, propertyId: booking.propertyId },
      );
      return { sent: false, recipients: [], reason: 'No recipients configured' };
    }

    const paymentAttempts = await this.prisma.payment.count({ where: { bookingId } });

    this.logger.logInfo(
      'Loaded payment attempts for cancellation request email',
      'SchedulerService',
      'requestAdminCancellationForBooking',
      requestId,
      { bookingId, paymentAttempts },
    );

    let occupancyTotals:
      | {
          occupancyRate: number;
          occupiedRooms: number;
          totalRooms: number;
          blockedRooms: number;
        }
      | undefined;

    try {
      const occupancy = await this.occupancyService.getDailyOccupancy({
        propertyId: booking.propertyId,
        date: checkinDate,
        requestId,
      });
      occupancyTotals = {
        occupancyRate: occupancy?.totals?.occupancyRate ?? 0,
        occupiedRooms: occupancy?.totals?.occupiedRooms ?? 0,
        totalRooms: occupancy?.totals?.totalRooms ?? 0,
        blockedRooms: occupancy?.totals?.blockedRooms ?? 0,
      };

      this.logger.logInfo(
        'Fetched occupancy snapshot for cancellation request email',
        'SchedulerService',
        'requestAdminCancellationForBooking',
        requestId,
        { bookingId, propertyId: booking.propertyId, checkinDate },
        occupancyTotals,
      );
    } catch (error) {
      this.logger.logWarn(
        'Failed to load occupancy for cancellation request email; continuing without it',
        'SchedulerService',
        'requestAdminCancellationForBooking',
        requestId,
        { bookingId, error: String(error) },
      );
    }

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { requiresManagerApproval: true },
    });

    await this.emailService.sendAdminCancellationRequest(
      bookingId,
      recipients,
      {
        reservationId: booking.reservationId,
        guestEmail: booking.guestEmail || 'unknown',
        propertyName: booking.propertyName || 'Property',
        startDate: booking.startDate,
        totalAmount: booking.totalAmount.toNumber(),
        currency: booking.currency,
        paymentAttempts,
        occupancy: occupancyTotals,
      },
      requestId,
    );

    this.logger.logInfo(
      'Admin cancellation request email sent',
      'SchedulerService',
      'requestAdminCancellationForBooking',
      requestId,
      {
        bookingId,
        reservationId: booking.reservationId,
        propertyId: booking.propertyId,
        recipientsCount: recipients.length,
      },
    );

    return { sent: true, recipients };
  }

  async findBookingForAdminCancellation(params: {
    bookingId?: string;
    reservationId?: string;
  }): Promise<{ id: string } | null> {
    if (params.bookingId) {
      return this.prisma.booking.findUnique({
        where: { id: params.bookingId },
        select: { id: true },
      });
    }

    if (params.reservationId) {
      return this.prisma.booking.findUnique({
        where: { reservationId: params.reservationId },
        select: { id: true },
      });
    }

    return null;
  }

  private async requestAdminCancellationIfThresholdReached(
    bookingId: string,
    paymentAttempts: number,
    requestId: string,
  ): Promise<void> {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return;

    const settings = await this.getPropertyNotificationSetting(booking.propertyId);
    const threshold = settings?.cancelRequestAfterFailures ?? 2;

    this.logger.logInfo(
      'Evaluating admin cancellation request threshold',
      'SchedulerService',
      'requestAdminCancellationIfThresholdReached',
      requestId,
      {
        bookingId,
        reservationId: booking.reservationId,
        propertyId: booking.propertyId,
        paymentAttempts,
        threshold,
      },
    );

    if (paymentAttempts < threshold) {
      this.logger.logInfo(
        'Cancellation request threshold not reached; skipping',
        'SchedulerService',
        'requestAdminCancellationIfThresholdReached',
        requestId,
        { bookingId, paymentAttempts, threshold },
      );
      return;
    }

    await this.requestAdminCancellationForBooking(bookingId, requestId);
  }

  private mergeRecipients(adminEmails?: string[] | null, supportEmails?: string[] | null): string[] {
    return Array.from(
      new Set(
        [...(adminEmails ?? []), ...(supportEmails ?? [])]
          .map((e) => String(e || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private async getPropertyNotificationSetting(propertyId: string) {
    const propertySetting = await this.prisma.propertyNotificationSetting.findUnique({
      where: { propertyId },
    });

    if (propertySetting) return propertySetting;

    return this.prisma.propertyNotificationSetting.findFirst({
      where: { propertyId: null },
    });
  }
}
