import { BookingPolicyService } from './payment-policy.service';
import { PaymentPolicyPublisher } from './booking-policy.publisher';
export declare class BookingStoredConsumer {
    private readonly policyService;
    private readonly publisher;
    constructor(policyService: BookingPolicyService, publisher: PaymentPolicyPublisher);
    handle(event: any): Promise<void>;
}
