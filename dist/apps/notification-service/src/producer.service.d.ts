import { AppLogger } from '@hostelworld/common';
export declare class ProducerService {
    private readonly logger;
    private client;
    constructor(logger: AppLogger);
    publishNotificationSent(payload: unknown, correlationId?: string): Promise<void>;
    publishNotificationFailed(payload: unknown, correlationId?: string): Promise<void>;
}
