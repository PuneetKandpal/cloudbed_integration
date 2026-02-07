import { BookingPolicyService } from '../../../../../apps/booking-policy-service/src/booking-policy/services/payment-policy.service';
import { PaymentPolicyPublisher } from '../publishers/payment-policy.publisher';
export declare class BookingStoredConsumer {
    private readonly policyService;
    private readonly publisher;
    constructor(policyService: BookingPolicyService, publisher: PaymentPolicyPublisher);
    handle(event: any): Promise<void>;
}
