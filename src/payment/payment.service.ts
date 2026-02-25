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

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

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

      const payment = await this.prisma.payment.create({
        data: {
          bookingId,
          amount,
          currency: booking.currency,
          status: PaymentStatus.PENDING,
          attemptNumber: 1,
        },
      });

      const paymentResult = await this.authorizeAndCharge(
        payment.id,
        amount,
        requestId,
      );

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

        const payment = await tx.payment.create({
          data: {
            bookingId,
            amount: booking.remainingBalance,
            currency: booking.currency,
            status: PaymentStatus.PENDING,
            attemptNumber: 1,
          },
        });

        const paymentResult = await this.authorizeAndCharge(
          payment.id,
          remainingBalance,
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
    requestId: string,
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    this.logger.logInfo(
      'Authorizing and charging payment',
      'PaymentService',
      'authorizeAndCharge',
      requestId,
      { paymentId, amount },
    );

    const mockSuccess = Math.random() > 0.2;

    if (mockSuccess) {
      return {
        success: true,
        transactionId: `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } else {
      return {
        success: false,
        error: 'Card declined - insufficient funds',
      };
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

    const maxAttempts = parseInt(this.config.get('PAYMENT_MAX_RETRIES') || '3');

    if (attemptNumber < maxAttempts) {
      const nextRetryAt = new Date(Date.now() + 3600000);

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage,
          nextRetryAt,
        },
      });

      this.logger.logInfo(
        `Payment scheduled for retry attempt ${attemptNumber + 1}`,
        'PaymentService',
        'handlePaymentFailureTx',
        requestId,
        { paymentId, nextRetryAt },
      );
    } else {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.FAILED,
          errorMessage: `${errorMessage} - Max retries exceeded`,
        },
      });

      await tx.booking.update({
        where: { id: bookingId },
        data: { requiresManagerApproval: true },
      });

      this.logger.logError(
        'Payment failed after max retries, requires manager approval',
        'PaymentService',
        'handlePaymentFailureTx',
        new Error(errorMessage),
        requestId,
        { paymentId, bookingId },
      );
    }
  }
}
