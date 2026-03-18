import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { PaymentStatus, Prisma } from '@prisma/client';
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

  private resolveAutomationMode(): 'worker' | 'mock' {
    const mode = (this.config.get<string>('PAYMENT_AUTOMATION_MODE') || '').toLowerCase().trim();
    if (mode === 'worker') return 'worker';
    return 'mock';
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
    const scheduledFor = new Date();

    const task = await this.prisma.scheduledTask.create({
      data: {
        taskType: 'PAYMENT_CHARGE',
        taskData: {
          paymentId: params.paymentId,
          bookingId: params.bookingId,
          reservationId: params.reservationId,
          propertyId: params.propertyId,
          amount: params.amount,
          currency: params.currency,
          requestId: params.requestId,
        },
        scheduledFor,
        status: 'PENDING',
      },
      select: { id: true },
    });

    this.logger.logInfo(
      'Enqueued payment charge task for worker',
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

  private async waitForChargeTaskResult(params: {
    taskId: string;
    paymentId: string;
    requestId: string;
  }): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    const timeoutMs = Number.parseInt(
      this.config.get<string>('PAYMENT_SERVER_WAIT_TIMEOUT_MS') ?? `${10 * 60 * 1000}`,
      10,
    );
    const pollIntervalMs = Number.parseInt(
      this.config.get<string>('PAYMENT_SERVER_POLL_INTERVAL_MS') ?? '2000',
      10,
    );

    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const task = await this.prisma.scheduledTask.findUnique({
        where: { id: params.taskId },
        select: { status: true, errorMessage: true, completedAt: true },
      });

      if (!task) {
        return { success: false, error: 'Charge task not found' };
      }

      if (task.status === 'COMPLETED' || task.status === 'FAILED') {
        const payment = await this.prisma.payment.findUnique({
          where: { id: params.paymentId },
          select: { status: true, transactionId: true, errorMessage: true },
        });

        if (payment?.status === PaymentStatus.CAPTURED) {
          return { success: true, transactionId: payment.transactionId ?? undefined };
        }

        return {
          success: false,
          error: payment?.errorMessage ?? task.errorMessage ?? 'Payment charge failed',
        };
      }

      await new Promise((r) => setTimeout(r, Math.max(200, pollIntervalMs)));
    }

    this.logger.logWarn(
      'Timed out waiting for worker to finish payment charge',
      'PaymentService',
      'waitForChargeTaskResult',
      params.requestId,
      { taskId: params.taskId, paymentId: params.paymentId, timeoutMs },
    );

    return {
      success: false,
      error: `Timed out waiting for worker after ${timeoutMs}ms`,
    };
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
      const automationMode = this.resolveAutomationMode();

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

      const paymentResult = await this.authorizeAndCharge(
        payment.id,
        amount,
        {
          bookingId: booking.id,
          reservationId: booking.reservationId,
          propertyId: booking.propertyId,
          guestEmail: booking.guestEmail ?? undefined,
          currency: booking.currency,
        },
        requestId,
      );

      if (automationMode === 'worker') {
        return paymentResult;
      }

      if (paymentResult.success) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.CAPTURED,
            transactionId: paymentResult.transactionId,
            processedAt: new Date(),
          },
        });

        await this.prisma.booking.update({
          where: { id: bookingId },
          data: {
            paidAmount: booking.totalAmount,
            remainingBalance: 0,
          },
        });

        this.logger.logInfo(
          'Payment authorized and captured successfully',
          'PaymentService',
          'authorizePayment',
          requestId,
          { bookingId, transactionId: paymentResult.transactionId },
        );

        return paymentResult;
      } else {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            errorMessage: paymentResult.error,
            // Retry timing is handled by SchedulerService.processPaymentRetries (2h risky / 24h non-risky).
            // We keep nextRetryAt empty here to avoid conflicting schedules.
            nextRetryAt: null,
          },
        });

        this.logger.logWarn(
          'Payment authorization failed',
          'PaymentService',
          'authorizePayment',
          requestId,
          { bookingId, error: paymentResult.error },
        );

        return paymentResult;
      }
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
      const automationMode = this.resolveAutomationMode();

      if (automationMode === 'worker') {
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

        await this.authorizeAndCharge(
          payment.id,
          remainingBalance,
          {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            propertyId: booking.propertyId,
            guestEmail: booking.guestEmail ?? undefined,
            currency: booking.currency,
          },
          requestId,
        );

        return;
      }

      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const booking = await tx.booking.findUnique({
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

        const existingAttempts = await tx.payment.count({
          where: { bookingId },
        });
        const attemptNumber = existingAttempts + 1;

        const payment = await tx.payment.create({
          data: {
            bookingId,
            amount: booking.remainingBalance,
            currency: booking.currency,
            status: PaymentStatus.PENDING,
            attemptNumber,
          },
        });

        const paymentResult = await this.authorizeAndCharge(
          payment.id,
          remainingBalance,
          {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            propertyId: booking.propertyId,
            guestEmail: booking.guestEmail ?? undefined,
            currency: booking.currency,
          },
          requestId,
        );

        if (paymentResult.success) {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PaymentStatus.CAPTURED,
              transactionId: paymentResult.transactionId,
              processedAt: new Date(),
            },
          });

          await tx.booking.update({
            where: { id: bookingId },
            data: {
              paidAmount: booking.totalAmount,
              remainingBalance: 0,
            },
          });

          this.logger.logInfo(
            'Payment processed successfully',
            'PaymentService',
            'processPayment',
            requestId,
            { bookingId, transactionId: paymentResult.transactionId },
          );
        } else {
          await this.handlePaymentFailureTx(
            tx,
            payment.id,
            bookingId,
            payment.attemptNumber,
            paymentResult.error ?? 'Payment failed',
            requestId,
          );
        }
      });
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
   * Authorize and charge payment via payment gateway
   * Mock implementation - replace with actual gateway integration
   */
  private async authorizeAndCharge(
    paymentId: string,
    amount: number,
    context: {
      bookingId: string;
      reservationId: string;
      propertyId: string;
      guestEmail?: string;
      currency: string;
    },
    requestId: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    this.logger.logInfo(
      'Authorizing and charging payment',
      'PaymentService',
      'authorizeAndCharge',
      requestId,
      {
        paymentId,
        amount,
        bookingId: context.bookingId,
        reservationId: context.reservationId,
        propertyId: context.propertyId,
        guestEmail: context.guestEmail,
        currency: context.currency,
      },
    );

    const automationMode = this.resolveAutomationMode();

    if (automationMode === 'worker') {
      const { taskId } = await this.enqueueChargeTask({
        paymentId,
        bookingId: context.bookingId,
        reservationId: context.reservationId,
        propertyId: context.propertyId,
        amount,
        currency: context.currency,
        requestId,
      });

      return await this.waitForChargeTaskResult({
        taskId,
        paymentId,
        requestId,
      });
    }

    const mockSuccess = Math.random() > 0.2;

    if (mockSuccess) {
      return {
        success: true,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    }

    return {
      success: false,
      error: 'Card declined - insufficient funds',
    };
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
