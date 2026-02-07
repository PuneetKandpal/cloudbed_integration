import { CloudbedsParserService } from './cloudbeds.parser.service';
import { CloudbedsSourceDetectorService } from './cloudbeds.source-detector.service';
import { CloudbedsPublisher } from '../publishers/cloudbeds.publisher';
export declare class CloudbedsService {
    private readonly parser;
    private readonly sourceDetector;
    private readonly publisher;
    constructor(parser: CloudbedsParserService, sourceDetector: CloudbedsSourceDetectorService, publisher: CloudbedsPublisher);
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
