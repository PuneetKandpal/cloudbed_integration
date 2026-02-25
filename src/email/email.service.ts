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
   * Send payment reminder email with booking details
   */
  async sendPaymentReminder(
    bookingId: string,
    bookingDetails: {
      guestEmail: string;
      guestName?: string;
      reservationId: string;
      propertyName: string;
      startDate: Date;
      endDate: Date;
      totalAmount: number;
      currency: string;
      cancellationDeadline?: Date;
    },
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Preparing payment reminder email',
      'EmailService',
      'sendPaymentReminder',
      requestId,
      { bookingId, guestEmail: bookingDetails.guestEmail, reservationId: bookingDetails.reservationId },
    );

    const subject = `Payment Required: Reservation ${bookingDetails.reservationId}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">Payment Reminder</h2>
        <p>Dear ${bookingDetails.guestName || 'Guest'},</p>
        <p>This is a friendly reminder that payment is required for your upcoming reservation at <strong>${bookingDetails.propertyName}</strong>.</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #007bff;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Reservation ID:</strong> ${bookingDetails.reservationId}</p>
          <p><strong>Check-in:</strong> ${bookingDetails.startDate.toLocaleDateString()}</p>
          <p><strong>Check-out:</strong> ${bookingDetails.endDate.toLocaleDateString()}</p>
          <p><strong>Amount Due:</strong> ${bookingDetails.totalAmount} ${bookingDetails.currency}</p>
          ${bookingDetails.cancellationDeadline ? `<p><strong>Free Cancellation Until:</strong> ${bookingDetails.cancellationDeadline.toLocaleString()}</p>` : ''}
        </div>
        
        <p>Please complete your payment to secure your booking.</p>
        <p>If you have any questions, please contact our support team.</p>
        
        <p style="margin-top: 30px;">Thank you,<br/><strong>${bookingDetails.propertyName}</strong></p>
      </div>
    `;

    await this.sendEmail(
      bookingId,
      bookingDetails.guestEmail,
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
   * Send support notification for risky bookings requiring payment
   */
  async sendSupportNotification(
    bookingId: string,
    bookingDetails: {
      guestEmail: string;
      guestName?: string;
      reservationId: string;
      propertyName: string;
      startDate: Date;
      riskLevel: string;
      totalAmount: number;
      currency: string;
    },
    requestId: string,
  ): Promise<void> {
    const supportEmail = this.config.get('SUPPORT_EMAIL') || 'support@hotel.com';
    const subject = `High Risk Booking Alert: ${bookingDetails.reservationId}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">High Risk Booking Alert</h2>
        <p>A high-risk booking requires support team attention:</p>
        
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Reservation ID:</strong> ${bookingDetails.reservationId}</p>
          <p><strong>Guest:</strong> ${bookingDetails.guestName || 'N/A'} (${bookingDetails.guestEmail})</p>
          <p><strong>Property:</strong> ${bookingDetails.propertyName}</p>
          <p><strong>Check-in:</strong> ${bookingDetails.startDate.toLocaleDateString()}</p>
          <p><strong>Amount:</strong> ${bookingDetails.totalAmount} ${bookingDetails.currency}</p>
          <p><strong>Risk Level:</strong> <span style="color: #dc3545;">${bookingDetails.riskLevel}</span></p>
        </div>
        
        <p>Action Required: Contact guest to confirm payment within 24 hours.</p>
      </div>
    `;

    await this.sendEmail(
      bookingId,
      supportEmail,
      subject,
      body,
      EmailType.SUPPORT_NOTIFICATION,
      requestId,
    );
  }

  /**
   * Send manager approval request for failed payments
   */
  async sendManagerApprovalRequest(
    bookingId: string,
    bookingDetails: {
      reservationId: string;
      guestEmail: string;
      guestName?: string;
      propertyName: string;
      startDate: Date;
      totalAmount: number;
      currency: string;
      paymentAttempts: number;
      riskLevel?: string;
    },
    requestId: string,
  ): Promise<void> {
    this.logger.logInfo(
      'Sending manager approval request',
      'EmailService',
      'sendManagerApprovalRequest',
      requestId,
      { bookingId, reservationId: bookingDetails.reservationId, paymentAttempts: bookingDetails.paymentAttempts },
    );

    const managerEmail = this.config.get('MANAGER_EMAIL') || 'manager@hotel.com';
    const subject = `Manager Approval Required: ${bookingDetails.reservationId}`;
    const body = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Manager Approval Required - Payment Failed</h2>
        <p>The following booking requires your immediate attention and authorization for cancellation:</p>
        
        <div style="background-color: #f8d7da; padding: 15px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Reservation ID:</strong> ${bookingDetails.reservationId}</p>
          <p><strong>Guest:</strong> ${bookingDetails.guestName || 'N/A'} (${bookingDetails.guestEmail})</p>
          <p><strong>Property:</strong> ${bookingDetails.propertyName}</p>
          <p><strong>Check-in Date:</strong> ${bookingDetails.startDate.toLocaleDateString()}</p>
          <p><strong>Amount Due:</strong> ${bookingDetails.totalAmount} ${bookingDetails.currency}</p>
          <p><strong>Payment Attempts:</strong> ${bookingDetails.paymentAttempts}</p>
          ${bookingDetails.riskLevel ? `<p><strong>Risk Level:</strong> ${bookingDetails.riskLevel}</p>` : ''}
        </div>
        
        <p><strong>Status:</strong> Payment has failed after ${bookingDetails.paymentAttempts} attempts.</p>
        <p><strong>Action Required:</strong> Please review this booking and authorize cancellation if appropriate.</p>
        
        <p style="margin-top: 30px;">This is an automated notification from the Booking Management System.</p>
      </div>
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
