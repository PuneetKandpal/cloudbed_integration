import { ClientProxy } from '@nestjs/microservices';
export declare class PaymentPolicyPublisher {
    private readonly client;
    constructor(client: ClientProxy);
    requestPayment(booking: any): import("rxjs").Observable<any>;
}
