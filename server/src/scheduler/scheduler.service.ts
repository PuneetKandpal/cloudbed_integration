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
   * Process payment retries based on risk assessment
   * - Non-risky bookings: retry after 24 hours
   * - Risky bookings: retry after 2 hours
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processPaymentRetries(): Promise<void> {
    const requestId = `scheduler-retries-${Date.now()}`;
    
    this.logger.logInfo(
      'Starting payment retries processing job',
      'SchedulerService',
      'processPaymentRetries',
      requestId,
      {},
    );

    try {
      const now = new Date();
      
      // Find bookings with failed payments that are due for retry
      const bookingsForRetry = await this.prisma.booking.findMany({
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
        },
      });

      this.logger.logInfo(
        'Found bookings with failed payments',
        'SchedulerService',
        'processPaymentRetries',
        requestId,
        { count: bookingsForRetry.length },
      );

      let retryCount = 0;
      let escalationCount = 0;
      let skippedCount = 0;

      for (const booking of bookingsForRetry) {
        const lastPayment = booking.payments[0];
        const riskAssessment = booking.riskAssessments[0];
        
        if (!lastPayment) {
          this.logger.logWarn(
            'Skipping booking without failed payment record',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            { bookingId: booking.id },
          );
          continue;
        }

        const minutesSinceFailure = differenceInMinutes(now, lastPayment.createdAt);
        const isRisky = riskAssessment?.riskLevel === RiskLevel.HIGH || 
                       riskAssessment?.riskLevel === RiskLevel.CRITICAL;

        // Risky bookings: retry after 2 hours
        // Non-risky bookings: retry after 24 hours
        const retryThresholdMinutes = isRisky ? 120 : 1440;
        
        this.logger.logInfo(
          'Evaluating booking for retry/escalation',
          'SchedulerService',
          'processPaymentRetries',
          requestId,
          {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            attemptNumber: lastPayment.attemptNumber,
            paymentStatus: lastPayment.status,
            minutesSinceFailure,
            isRisky,
            riskLevel: riskAssessment?.riskLevel ?? 'NONE',
            retryThresholdMinutes,
            escalatedAt: booking.escalatedAt,
          },
        );
        
        if (minutesSinceFailure >= retryThresholdMinutes) {
          this.logger.logInfo(
            'Processing payment retry',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              reservationId: booking.reservationId,
              minutesSinceFailure,
              isRisky,
              retryThresholdMinutes,
            },
          );

          await this.retryPayment(booking, riskAssessment, requestId);
          retryCount++;
        } else {
          this.logger.logInfo(
            'Skipping retry - not enough time elapsed',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              minutesSinceFailure,
              retryThresholdMinutes,
              nextRetryInMinutes: retryThresholdMinutes - minutesSinceFailure,
            },
          );
        }

        // Escalate on first payment failure if check-in is within 2 days and not already escalated
        if (lastPayment.attemptNumber === 1 && !booking.escalatedAt) {
          this.logger.logInfo(
            'Checking escalation criteria for first payment failure',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              attemptNumber: lastPayment.attemptNumber,
              escalatedAt: booking.escalatedAt,
            },
          );

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

          this.logger.logInfo(
            'Calculated days until check-in for escalation',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              propertyTimeZone,
              nowLocalDateOnly,
              checkInLocalDateOnly,
              daysUntilCheckIn,
            },
          );

          if (daysUntilCheckIn <= 2) {
            this.logger.logInfo(
              'Escalating first payment failure',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              {
                bookingId: booking.id,
                reservationId: booking.reservationId,
                attemptNumber: lastPayment.attemptNumber,
                daysUntilCheckIn,
              },
            );

            escalationCount++;

            this.logger.logInfo(
              'Performing risk assessment for escalation',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              { bookingId: booking.id },
            );

            await this.riskService.assessBookingRisk(booking.id, requestId);

            const latestRisk = await this.prisma.riskAssessment.findFirst({
              where: { bookingId: booking.id },
              orderBy: { assessedAt: 'desc' },
            });

            this.logger.logInfo(
              'Risk assessment completed for escalation',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              {
                bookingId: booking.id,
                riskLevel: latestRisk?.riskLevel ?? 'UNKNOWN',
                riskScore: latestRisk?.riskScore ?? 0,
              },
            );

            try {
              this.logger.logInfo(
                'Generating payment link for escalation',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                {
                  bookingId: booking.id,
                  reservationId: booking.reservationId,
                  propertyId: booking.propertyId,
                },
              );

              const paymentLink = await this.cloudbedApi.generatePaymentLink(
                { reservationId: booking.reservationId, propertyId: booking.propertyId },
                requestId,
              );

              this.logger.logInfo(
                'Payment link generated successfully',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                {
                  bookingId: booking.id,
                  paymentLinkGenerated: !!paymentLink,
                },
              );

              await this.prisma.booking.update({
                where: { id: booking.id },
                data: { escalatedAt: now },
              });

              this.logger.logInfo(
                'Marked booking as escalated',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                {
                  bookingId: booking.id,
                  escalatedAt: now.toISOString(),
                },
              );

              if (booking.guestEmail) {
                this.logger.logInfo(
                  'Sending payment link email to guest',
                  'SchedulerService',
                  'processPaymentRetries',
                  requestId,
                  {
                    bookingId: booking.id,
                    guestEmail: booking.guestEmail,
                  },
                );

                try {
                  await this.emailService.sendPaymentLink(
                    booking.id,
                    booking.guestEmail,
                    paymentLink,
                    requestId,
                  );

                  this.logger.logInfo(
                    'Payment link email sent successfully',
                    'SchedulerService',
                    'processPaymentRetries',
                    requestId,
                    { bookingId: booking.id },
                  );
                } catch (error) {
                  this.logger.logWarn(
                    'Failed to send payment link email during escalation',
                    'SchedulerService',
                    'processPaymentRetries',
                    requestId,
                    { bookingId: booking.id, error: String(error) },
                  );
                }
              } else {
                this.logger.logWarn(
                  'No guest email available - skipping payment link email',
                  'SchedulerService',
                    'processPaymentRetries',
                    requestId,
                    { bookingId: booking.id },
                  );
              }

              this.logger.logInfo(
                'Sending support notification',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                {
                  bookingId: booking.id,
                  guestEmail: booking.guestEmail || 'unknown',
                  riskLevel: latestRisk?.riskLevel ?? 'UNKNOWN',
                },
              );

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

                this.logger.logInfo(
                  'Support notification sent successfully',
                  'SchedulerService',
                  'processPaymentRetries',
                  requestId,
                  { bookingId: booking.id },
                );
              } catch (error) {
                this.logger.logWarn(
                  'Failed to send support notification during escalation',
                  'SchedulerService',
                  'processPaymentRetries',
                  requestId,
                  { bookingId: booking.id, error: String(error) },
                );
              }

              this.logger.logInfo(
                'Escalation completed for first payment failure',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                { bookingId: booking.id },
              );
            } catch (error) {
              this.logger.logWarn(
                'Failed to complete escalation for first payment failure',
                'SchedulerService',
                'processPaymentRetries',
                requestId,
                { bookingId: booking.id, error: String(error) },
              );
            }
          } else {
            this.logger.logInfo(
              'Skipping escalation - check-in too far away',
              'SchedulerService',
              'processPaymentRetries',
              requestId,
              {
                bookingId: booking.id,
                daysUntilCheckIn,
                threshold: 2,
              },
            );
            skippedCount++;
          }
        } else {
          this.logger.logInfo(
            'Skipping escalation - not first attempt or already escalated',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              attemptNumber: lastPayment.attemptNumber,
              escalatedAt: booking.escalatedAt,
            },
          );
          skippedCount++;
        }
      }

      this.logger.logInfo(
        'Completed payment retries processing job - Summary',
        'SchedulerService',
        'processPaymentRetries',
        requestId,
        {
          totalBookings: bookingsForRetry.length,
          retriesProcessed: retryCount,
          escalationsProcessed: escalationCount,
          skipped: skippedCount,
        },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to process payment retries',
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
   * Retry payment based on risk assessment
   */
  private async retryPayment(
    booking: any,
    riskAssessment: any,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Retrying payment',
      'SchedulerService',
      'retryPayment',
      requestId,
      {
        bookingId: booking.id,
        reservationId: booking.reservationId,
        riskLevel: riskAssessment?.riskLevel,
      },
    );

    try {
      const paymentResult = await this.paymentService.authorizePayment(
        booking.id,
        booking.remainingBalance.toNumber(),
        requestId,
      );

      if (paymentResult.success) {
        this.logger.logInfo(
          'Payment retry successful',
          'SchedulerService',
          'retryPayment',
          requestId,
          { bookingId: booking.id },
        );

        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        });
      } else {
        this.logger.logWarn(
          'Payment retry failed - escalating to manager',
          'SchedulerService',
          'retryPayment',
          requestId,
          { bookingId: booking.id },
        );

        // Count payment attempts
        const paymentAttempts = await this.prisma.payment.count({
          where: { bookingId: booking.id },
        });

        await this.requestAdminCancellationIfThresholdReached(
          booking.id,
          paymentAttempts,
          requestId,
        );
      }
    } catch (error) {
      this.logger.logError(
        'Failed to retry payment',
        'SchedulerService',
        'retryPayment',
        error,
        requestId,
        { bookingId: booking.id },
      );
    }
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
