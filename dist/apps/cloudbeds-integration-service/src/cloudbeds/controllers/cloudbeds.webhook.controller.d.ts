import { CloudbedsService } from '../services/cloudbeds.service';
export declare class CloudbedsWebhookController {
    private readonly cloudbedsService;
    constructor(cloudbedsService: CloudbedsService);
    handleWebhook(payload: any): Promise<{
        eventType: string;
        source: import("../constants/booking-source.constants").BookingSource;
        reservationId: string;
        checkInDate: string;
        checkOutDate: string;
        timestamp: string;
        rawPayload: any;
    }>;
}
