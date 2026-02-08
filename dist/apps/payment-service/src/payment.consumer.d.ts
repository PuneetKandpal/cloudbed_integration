import { MockPaymentService } from './payment.service';
import { LoggerService } from './logger.service';
export declare class PaymentConsumer {
    private readonly payment;
    private readonly logger;
    private publisher;
    constructor(payment: MockPaymentService, logger: LoggerService);
    handlePayment(payload: any): void;
}
