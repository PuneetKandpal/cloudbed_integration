import { LoggerService } from './logger.service';
export declare class BookingPublisher {
    private readonly logger;
    private client;
    constructor(logger: LoggerService);
    publishBookingCreated(payload: unknown, correlationId?: string): Promise<void>;
    publishBookingUpdated(payload: unknown, correlationId?: string): Promise<void>;
    publishBookingCancelled(payload: unknown, correlationId?: string): Promise<void>;
}
