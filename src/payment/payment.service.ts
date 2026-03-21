import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { ChargeTaskStatus, PaymentStatus, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

/**
 * Payment Service
 * Handles payment authorization, charging, and retry logic
 */
@Injectable()
export class PaymentService {
  private readonly logger = new LoggerService('PaymentService');

  private readonly paymentGatewayConfig: {
    loginUrl: string;
    chargeUrl: string;
    username: string;
    password: string;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.paymentGatewayConfig = {
      loginUrl: this.config.get<string>('PAYMENT_GATEWAY_LOGIN_URL') || '',
      chargeUrl: this.config.get<string>('PAYMENT_GATEWAY_CHARGE_URL') || '',
      username: this.config.get<string>('PAYMENT_GATEWAY_USERNAME') || '',
      password: this.config.get<string>('PAYMENT_GATEWAY_PASSWORD') || '',
    };
  }

  private async enqueueChargeTask(params: {
    paymentId: string;
    bookingId: string;
    reservationId: string;
    propertyId: string;
    amount: number;
    currency: string;
    requestId: string;
  }): Promise<{ taskId: string }> {
    const task = await this.prisma.chargeTask.create({
      data: {
        paymentId: params.paymentId,
        bookingId: params.bookingId,
        reservationId: params.reservationId,
        propertyId: params.propertyId,
        amount: params.amount,
        currency: params.currency,
        requestId: params.requestId,
        status: ChargeTaskStatus.PENDING,
        scheduledFor: new Date(),
      },
      select: { id: true },
    });

    this.logger.logInfo(
      'Enqueued payment charge task to ChargeTask table for worker',
      'PaymentService',
      'enqueueChargeTask',
      params.requestId,
      {
        taskId: task.id,
        paymentId: params.paymentId,
        bookingId: params.bookingId,
        reservationId: params.reservationId,
        propertyId: params.propertyId,
        amount: params.amount,
        currency: params.currency,
      },
    );

    return { taskId: task.id };
  }


  /**
   * Authorize payment for a booking
   * Called by scheduler and payment workflows
   * Returns payment result for decision-making
   */
  async authorizePayment(
    bookingId: string,
    amount: number,
    requestId: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    this.logger.logInfo(
      'Authorizing payment for booking',
      'PaymentService',
      'authorizePayment',
      requestId,
      { bookingId, amount },
    );

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return { success: false, error: 'Booking not found' };
      }

      const existingAttempts = await this.prisma.payment.count({
        where: { bookingId },
      });
      const attemptNumber = existingAttempts + 1;

      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount,
          currency: booking.currency,
          status: PaymentStatus.PENDING,
          attemptNumber,
        },
      });

      // Enqueue charge task for worker (fire-and-forget)
      await this.enqueueChargeTask({
        paymentId: payment.id,
        bookingId: booking.id,
        reservationId: booking.reservationId,
        propertyId: booking.propertyId,
        amount,
        currency: booking.currency,
        requestId,
      });

      this.logger.logInfo(
        'Payment charge task enqueued for worker',
        'PaymentService',
        'authorizePayment',
        requestId,
        { bookingId, paymentId: payment.id },
      );

      // Return immediately - worker will process asynchronously
      return {
        success: true,
      };
    } catch (error) {
      this.logger.logError(
        'Failed to authorize payment',
        'PaymentService',
        'authorizePayment',
        error,
        requestId,
        { bookingId },
      );
      return { success: false, error: String(error) };
    }
  }

  /**
   * Process payment for booking
   * Attempts authorization and capture
   */
  async processPayment(bookingId: string, requestId: string): Promise<void> {
    this.logger.logInfo(
      'Processing payment for booking',
      'PaymentService',
      'processPayment',
      requestId,
      { bookingId },
    );

    try {
      // Always enqueue to worker - no mode switching needed
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const remainingBalance = booking.remainingBalance.toNumber();

      if (remainingBalance <= 0) {
        this.logger.logInfo(
          'No outstanding balance, skipping payment',
          'PaymentService',
          'processPayment',
          requestId,
          { bookingId },
        );
        return;
      }

      const existingAttempts = await this.prisma.payment.count({
        where: { bookingId },
      });
      const attemptNumber = existingAttempts + 1;

      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount: booking.remainingBalance,
          currency: booking.currency,
          status: PaymentStatus.PENDING,
          attemptNumber,
        },
      });

      // Enqueue charge task for worker (fire-and-forget)
      await this.enqueueChargeTask({
        paymentId: payment.id,
        bookingId: booking.id,
        reservationId: booking.reservationId,
        propertyId: booking.propertyId,
        amount: remainingBalance,
        currency: booking.currency,
        requestId,
      });

      this.logger.logInfo(
        'Payment charge task enqueued for worker',
        'PaymentService',
        'processPayment',
        requestId,
        { bookingId, paymentId: payment.id },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to process payment',
        'PaymentService',
        'processPayment',
        error,
        requestId,
        { bookingId },
      );
      throw error;
    }
  }


  /**
   * Handle payment failure
   * Schedule retries if within limit
   */
  private async handlePaymentFailureTx(
    tx: Prisma.TransactionClient,
    paymentId: string,
    bookingId: string,
    attemptNumber: number,
    errorMessage: string,
    requestId: string,
  ): Promise<void> {
    this.logger.logWarn(
      'Payment failed, handling failure',
      'PaymentService',
      'handlePaymentFailureTx',
      requestId,
      { paymentId, bookingId, attemptNumber, errorMessage },
    );

    await tx.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        errorMessage,
        // Retry timing is handled by SchedulerService.processPaymentRetries.
        nextRetryAt: null,
      },
    });

    // Escalation (admin cancellation request after N failures) is handled in SchedulerService.retryPayment()
    // where we have access to risk assessment + attempt counts.
  }
}
