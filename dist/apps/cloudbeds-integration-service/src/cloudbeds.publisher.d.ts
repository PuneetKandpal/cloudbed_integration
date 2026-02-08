import { ClientProxy } from '@nestjs/microservices';
export declare class CloudbedsPublisher {
    private readonly client;
    constructor(client: ClientProxy);
    publishBookingReceived(event: any): import("rxjs").Observable<any>;
}
