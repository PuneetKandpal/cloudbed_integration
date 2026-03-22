"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const nodemailer = __importStar(require("nodemailer"));
let EmailService = class EmailService {
    prisma;
    config;
    logger = new logger_service_1.LoggerService('EmailService');
    transporter;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
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
    async sendPaymentReminder(bookingId, bookingDetails, requestId) {
        this.logger.logInfo('Preparing payment reminder email', 'EmailService', 'sendPaymentReminder', requestId, { bookingId, guestEmail: bookingDetails.guestEmail, reservationId: bookingDetails.reservationId });
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
        await this.sendEmail(bookingId, bookingDetails.guestEmail, subject, body, client_1.EmailType.PAYMENT_REMINDER, requestId);
    }
    async sendPaymentLink(bookingId, guestEmail, paymentLink, requestId) {
        const subject = 'Complete Your Payment - Immediate Action Required';
        const body = `
      <h2>Payment Required</h2>
      <p>Dear Guest,</p>
      <p>Your reservation requires immediate payment.</p>
      <p>Please click the link below to complete your payment:</p>
      <p><a href="${paymentLink}">Complete Payment</a></p>
      <p>Thank you,<br/>Your Hotel Team</p>
    `;
        await this.sendEmail(bookingId, guestEmail, subject, body, client_1.EmailType.PAYMENT_LINK, requestId);
    }
    async sendCancellationWarning(bookingId, guestEmail, hoursRemaining, requestId) {
        const subject = 'Urgent: Your Reservation May Be Cancelled';
        const body = `
      <h2>Cancellation Warning</h2>
      <p>Dear Guest,</p>
      <p>Your reservation will be cancelled in ${hoursRemaining} hours if payment is not received.</p>
      <p>Please complete your payment immediately to avoid cancellation.</p>
      <p>Thank you,<br/>Your Hotel Team</p>
    `;
        await this.sendEmail(bookingId, guestEmail, subject, body, client_1.EmailType.CANCELLATION_WARNING, requestId);
    }
    async sendSupportNotification(bookingId, bookingDetails, requestId) {
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
        await this.sendEmail(bookingId, supportEmail, subject, body, client_1.EmailType.SUPPORT_NOTIFICATION, requestId);
    }
    async sendManagerApprovalRequest(bookingId, bookingDetails, requestId) {
        this.logger.logInfo('Sending manager approval request', 'EmailService', 'sendManagerApprovalRequest', requestId, { bookingId, reservationId: bookingDetails.reservationId, paymentAttempts: bookingDetails.paymentAttempts });
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
        await this.sendEmail(bookingId, managerEmail, subject, body, client_1.EmailType.MANAGER_APPROVAL_REQUEST, requestId);
    }
    async sendAdminCancellationRequest(bookingId, recipients, bookingDetails, requestId) {
        const subject = `Action Required: Cancel Reservation ${bookingDetails.reservationId}`;
        const occupancyBlock = bookingDetails.occupancy
            ? `
        <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-left: 4px solid #0d6efd;">
          <h3 style="margin-top: 0;">Occupancy Status (Check-in Date)</h3>
          <p><strong>Occupancy Rate:</strong> ${bookingDetails.occupancy.occupancyRate}%</p>
          <p><strong>Occupied Rooms:</strong> ${bookingDetails.occupancy.occupiedRooms} / ${bookingDetails.occupancy.totalRooms}</p>
          <p><strong>Blocked Rooms:</strong> ${bookingDetails.occupancy.blockedRooms}</p>
        </div>
      `
            : '';
        const body = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Cancellation Requested - Payment Failed</h2>
        <p>Payment has failed <strong>${bookingDetails.paymentAttempts}</strong> times for the following booking.</p>
        <p><strong>Action Required:</strong> Please cancel this reservation in Cloudbeds.</p>
        
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0;">Booking Details</h3>
          <p><strong>Booking ID:</strong> ${bookingId}</p>
          <p><strong>Reservation ID:</strong> ${bookingDetails.reservationId}</p>
          <p><strong>Guest:</strong> ${bookingDetails.guestName || 'N/A'} (${bookingDetails.guestEmail})</p>
          <p><strong>Property:</strong> ${bookingDetails.propertyName}</p>
          <p><strong>Check-in Date:</strong> ${bookingDetails.startDate.toLocaleDateString()}</p>
          <p><strong>Amount Due:</strong> ${bookingDetails.totalAmount} ${bookingDetails.currency}</p>
          <p><strong>Payment Attempts:</strong> ${bookingDetails.paymentAttempts}</p>
        </div>

        ${occupancyBlock}

        <p style="margin-top: 25px;">This is an automated notification from the Booking Management System.</p>
      </div>
    `;
        const uniqueRecipients = Array.from(new Set((recipients || [])
            .map((r) => String(r || '').trim())
            .filter(Boolean)));
        for (const recipient of uniqueRecipients) {
            await this.sendEmail(bookingId, recipient, subject, body, client_1.EmailType.ADMIN_CANCELLATION_REQUEST, requestId);
        }
    }
    async sendEmail(bookingId, recipient, subject, body, emailType, requestId) {
        this.logger.logInfo('Sending email', 'EmailService', 'sendEmail', requestId, { bookingId, recipient, emailType });
        try {
            const emailRecord = await this.prisma.email.create({
                data: {
                    bookingId,
                    recipient,
                    subject,
                    body,
                    emailType,
                    status: client_1.EmailStatus.PENDING,
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
                    status: client_1.EmailStatus.SENT,
                    sentAt: new Date(),
                },
            });
            this.logger.logInfo('Successfully sent email', 'EmailService', 'sendEmail', requestId, { bookingId, emailType });
        }
        catch (error) {
            this.logger.logError('Failed to send email', 'EmailService', 'sendEmail', error, requestId, { bookingId, recipient, emailType });
            throw error;
        }
    }
};
exports.EmailService = EmailService;
exports.EmailService = EmailService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], EmailService);
//# sourceMappingURL=email.service.js.map