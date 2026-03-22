import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from '../email/email.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';
import { OccupancyService } from '../occupancy/occupancy.service';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
export declare class SchedulerService {
    private readonly prisma;
    private readonly paymentService;
    private readonly emailService;
    private readonly riskService;
    private readonly occupancyService;
    private readonly cloudbedApi;
    private readonly logger;
    constructor(prisma: PrismaService, paymentService: PaymentService, emailService: EmailService, riskService: RiskAssessmentService, occupancyService: OccupancyService, cloudbedApi: CloudbedApiService);
    monitorFlexibleBookings(): Promise<void>;
    processNonRefundableBookings(): Promise<void>;
    processPaymentRetries(): Promise<void>;
    sendPaymentReminders(): Promise<void>;
    private processFlexibleBookingPayment;
    private initiatePaymentWorkflow;
    private retryPayment;
    requestAdminCancellationForBooking(bookingId: string, requestId: string, options?: {
        force?: boolean;
    }): Promise<{
        sent: boolean;
        recipients: string[];
        reason?: string;
    }>;
    findBookingForAdminCancellation(params: {
        bookingId?: string;
        reservationId?: string;
    }): Promise<{
        id: string;
    } | null>;
    private requestAdminCancellationIfThresholdReached;
    private mergeRecipients;
    private getPropertyNotificationSetting;
}
