import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { EmailType, EmailStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Email Service
 * Handles all email communications for the system
 */
@Injectable()
export class EmailService {
  private readonly logger = new LoggerService('EmailService');
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST') || 'smtp.gmail.com',
      port: parseInt(this.config.get('SMTP_PORT') || '587'),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASSWORD'),
      },
    });
  }

  /**
   * Send payment reminder email
   */
  async sendPaymentReminder(
    bookingId: string,
    guestEmail: string,
    requestId: string,
  ): Promise<void> {
    const subject = 'Payment Reminder for Your Upcoming Reservation';
    const body = `
      <h2>Payment Reminder</h2>
      <p>Dear Guest,</p>
      <p>This is a reminder that payment is required for your upcoming reservation.</p>
      <p>Please complete your payment to secure your booking.</p>
      <p>Thank you,<br/>Your Hotel Team</p>
    `;

    await this.sendEmail(
      bookingId,
      guestEmail,
      subject,
      body,
      EmailType.PAYMENT_REMINDER,
      requestId,
    );
  }

  /**
   * Send payment link email
   */
  async sendPaymentLink(
    bookingId: string,
    guestEmail: string,
    paymentLink: string,
    requestId: string,
  ): Promise<void> {
    const subject = 'Complete Your Payment - Immediate Action Required';
    const body = `
      <h2>Payment Required</h2>
      <p>Dear Guest,</p>
      <p>Your reservation requires immediate payment.</p>
      <p>Please click the link below to complete your payment:</p>
      <p><a href="${paymentLink}">Complete Payment</a></p>
      <p>Thank you,<br/>Your Hotel Team</p>
    `;

    await this.sendEmail(
      bookingId,
      guestEmail,
      subject,
      body,
      EmailType.PAYMENT_LINK,
      requestId,
    );
  }

  /**
   * Send cancellation warning email
   */
  async sendCancellationWarning(
    bookingId: string,
    guestEmail: string,
    hoursRemaining: number,
    requestId: string,
  ): Promise<void> {
    const subject = 'Urgent: Your Reservation May Be Cancelled';
    const body = `
      <h2>Cancellation Warning</h2>
      <p>Dear Guest,</p>
      <p>Your reservation will be cancelled in ${hoursRemaining} hours if payment is not received.</p>
      <p>Please complete your payment immediately to avoid cancellation.</p>
      <p>Thank you,<br/>Your Hotel Team</p>
    `;

    await this.sendEmail(
      bookingId,
      guestEmail,
      subject,
      body,
      EmailType.CANCELLATION_WARNING,
      requestId,
    );
  }

  /**
   * Send manager approval request
   */
  async sendManagerApprovalRequest(
    bookingId: string,
    bookingDetails: any,
    requestId: string,
  ): Promise<void> {
    const managerEmail = this.config.get('MANAGER_EMAIL') || 'manager@hotel.com';
    const subject = 'Manager Approval Required - Payment Failed';
    const body = `
      <h2>Manager Approval Required</h2>
      <p>The following booking requires your attention:</p>
      <ul>
        <li>Booking ID: ${bookingId}</li>
        <li>Reservation ID: ${bookingDetails.reservationId}</li>
        <li>Amount: ${bookingDetails.totalAmount}</li>
        <li>Check-in: ${bookingDetails.startDate}</li>
      </ul>
      <p>Payment has failed after maximum retries. Please review and decide on cancellation.</p>
    `;

    await this.sendEmail(
      bookingId,
      managerEmail,
      subject,
      body,
      EmailType.MANAGER_APPROVAL_REQUEST,
      requestId,
    );
  }

  /**
   * Core email sending function
   */
  private async sendEmail(
    bookingId: string,
    recipient: string,
    subject: string,
    body: string,
    emailType: EmailType,
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Sending email',
      'EmailService',
      'sendEmail',
      requestId,
      { bookingId, recipient, emailType },
    );

    try {
      const emailRecord = await this.prisma.email.create({
        data: {
          bookingId,
          recipient,
          subject,
          body,
          emailType,
          status: EmailStatus.PENDING,
        },
      });

      const fromEmail = this.config.get('FROM_EMAIL') || 'noreply@hotel.com';

      await this.transporter.sendMail({
        from: fromEmail,
        to: recipient,
        subject,
        html: body,
      });

      await this.prisma.email.update({
        where: { id: emailRecord.id },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      this.logger.logInfo(
        'Successfully sent email',
        'EmailService',
        'sendEmail',
        requestId,
        { bookingId, emailType },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to send email',
        'EmailService',
        'sendEmail',
        error,
        requestId,
        { bookingId, recipient, emailType },
      );

      throw error;
    }
  }
}
