import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from '../email/email.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';
import { BookingStatus, BookingPolicyType, PaymentStatus, RiskLevel } from '@prisma/client';
import { differenceInHours, isBefore, addHours } from 'date-fns';

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
  ) {}

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

      for (const booking of bookingsForRetry) {
        const lastPayment = booking.payments[0];
        const riskAssessment = booking.riskAssessments[0];
        
        if (!lastPayment) continue;

        const hoursSinceFailure = differenceInHours(now, lastPayment.createdAt);
        const isRisky = riskAssessment?.riskLevel === RiskLevel.HIGH || 
                       riskAssessment?.riskLevel === RiskLevel.CRITICAL;
        
        // Risky bookings: retry after 2 hours
        // Non-risky bookings: retry after 24 hours
        const retryThreshold = isRisky ? 2 : 24;
        
        if (hoursSinceFailure >= retryThreshold) {
          this.logger.logInfo(
            'Processing payment retry',
            'SchedulerService',
            'processPaymentRetries',
            requestId,
            {
              bookingId: booking.id,
              reservationId: booking.reservationId,
              hoursSinceFailure,
              isRisky,
              retryThreshold,
            },
          );

          await this.retryPayment(booking, riskAssessment, requestId);
        }
      }

      this.logger.logInfo(
        'Completed payment retries processing job',
        'SchedulerService',
        'processPaymentRetries',
        requestId,
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
      const reminderWindow = addHours(now, 48);
      
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
          'Payment authorization successful',
          'SchedulerService',
          'initiatePaymentWorkflow',
          requestId,
          { bookingId: booking.id },
        );

        // Update booking status
        await this.prisma.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        });
      } else {
        this.logger.logWarn(
          'Payment authorization failed',
          'SchedulerService',
          'initiatePaymentWorkflow',
          requestId,
          { bookingId: booking.id, reason: paymentResult.error },
        );

        // Check if check-in is less than 48 hours
        const hoursUntilCheckIn = differenceInHours(booking.startDate, new Date());
        if (hoursUntilCheckIn < 48) {
          // Escalate to risk flow
          await this.riskService.assessBookingRisk(booking.id, requestId);
        }
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

        // Escalate to manager if max retries reached
        if (paymentAttempts >= 2) {
          await this.escalateToManager(booking, paymentAttempts, requestId);
        }
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
  private async escalateToManager(
    booking: any,
    paymentAttempts: number,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Escalating to manager for approval',
      'SchedulerService',
      'escalateToManager',
      requestId,
      {
        bookingId: booking.id,
        reservationId: booking.reservationId,
        paymentAttempts,
      },
    );

    try {
      // Mark booking as requiring manager approval
      await this.prisma.booking.update({
        where: { id: booking.id },
        data: { requiresManagerApproval: true },
      });

      // Send manager approval request email
      await this.emailService.sendManagerApprovalRequest(
        booking.id,
        {
          reservationId: booking.reservationId,
          guestEmail: booking.guestEmail || 'unknown',
          propertyName: booking.propertyName || 'Property',
          startDate: booking.startDate,
          totalAmount: booking.totalAmount.toNumber(),
          currency: booking.currency,
          paymentAttempts,
        },
        requestId,
      );

      this.logger.logInfo(
        'Successfully escalated to manager',
        'SchedulerService',
        'escalateToManager',
        requestId,
        { bookingId: booking.id },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to escalate to manager',
        'SchedulerService',
        'escalateToManager',
        error,
        requestId,
        { bookingId: booking.id },
      );
    }
  }
}
