import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private transporter;
    constructor(prisma: PrismaService, config: ConfigService);
    sendPaymentReminder(bookingId: string, bookingDetails: {
        guestEmail: string;
        guestName?: string;
        reservationId: string;
        propertyName: string;
        startDate: Date;
        endDate: Date;
        totalAmount: number;
        currency: string;
        cancellationDeadline?: Date;
    }, requestId: string): Promise<void>;
    sendPaymentLink(bookingId: string, guestEmail: string, paymentLink: string, requestId: string): Promise<void>;
    sendCancellationWarning(bookingId: string, guestEmail: string, hoursRemaining: number, requestId: string): Promise<void>;
    sendSupportNotification(bookingId: string, bookingDetails: {
        guestEmail: string;
        guestName?: string;
        reservationId: string;
        propertyName: string;
        startDate: Date;
        riskLevel: string;
        totalAmount: number;
        currency: string;
    }, requestId: string): Promise<void>;
    sendManagerApprovalRequest(bookingId: string, bookingDetails: {
        reservationId: string;
        guestEmail: string;
        guestName?: string;
        propertyName: string;
        startDate: Date;
        totalAmount: number;
        currency: string;
        paymentAttempts: number;
        riskLevel?: string;
    }, requestId: string): Promise<void>;
    sendAdminCancellationRequest(bookingId: string, recipients: string[], bookingDetails: {
        reservationId: string;
        guestEmail: string;
        guestName?: string;
        propertyName: string;
        startDate: Date;
        totalAmount: number;
        currency: string;
        paymentAttempts: number;
        occupancy?: {
            occupancyRate: number;
            occupiedRooms: number;
            totalRooms: number;
            blockedRooms: number;
        };
    }, requestId: string): Promise<void>;
    private sendEmail;
}
