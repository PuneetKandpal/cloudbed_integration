import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class PaymentService {
    private readonly prisma;
    private readonly config;
    private readonly logger;
    private readonly paymentGatewayConfig;
    constructor(prisma: PrismaService, config: ConfigService);
    private enqueueChargeTask;
    authorizePayment(bookingId: string, amount: number, requestId: string): Promise<{
        success: boolean;
        transactionId?: string;
        error?: string;
    }>;
    processPayment(bookingId: string, requestId: string): Promise<void>;
    private handlePaymentFailureTx;
}
