import { MockPaymentService } from '../services/mock-payment.service';
import { EventPublisher } from '@hostelworld/common';
export declare class PaymentConsumer {
    private readonly payment;
    private readonly publisher;
    constructor(payment: MockPaymentService, publisher: EventPublisher);
    handlePayment(payload: any): void;
}
