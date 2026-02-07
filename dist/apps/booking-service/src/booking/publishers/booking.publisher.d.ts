import { AppLogger } from '../../../../../libs/logger/src/logger.service';
export declare class BookingPublisher {
    private readonly logger;
    private client;
    constructor(logger: AppLogger);
    publishBookingCreated(payload: unknown, correlationId?: string): Promise<void>;
    publishBookingUpdated(payload: unknown, correlationId?: string): Promise<void>;
    publishBookingCancelled(payload: unknown, correlationId?: string): Promise<void>;
}
