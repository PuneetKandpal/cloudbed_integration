import { PrismaService } from '../prisma/prisma.service';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
import { PaymentService } from '../payment/payment.service';
import { RiskAssessmentService } from '../risk/risk-assessment.service';
import { CancellationPolicyService } from '../cancellation-policy/cancellation-policy.service';
export declare class BookingService {
    private readonly prisma;
    private readonly cloudbedApi;
    private readonly paymentService;
    private readonly riskService;
    private readonly cancellationPolicyService;
    private readonly logger;
    constructor(prisma: PrismaService, cloudbedApi: CloudbedApiService, paymentService: PaymentService, riskService: RiskAssessmentService, cancellationPolicyService: CancellationPolicyService);
    private resolvePropertyTimeZone;
    private shiftDateOnly;
    private parseCloudbedsDate;
    createBookingFromWebhook(payload: any, requestId: string): Promise<void>;
    private resolveReservationDates;
    private triggerPaymentWorkflow;
    updateBookingStatus(reservationId: string, status: string, requestId: string): Promise<void>;
    private mapStatus;
    updateRoomAssignment(reservationId: string, roomId: string, requestId: string): Promise<void>;
    private createAuditLog;
}
