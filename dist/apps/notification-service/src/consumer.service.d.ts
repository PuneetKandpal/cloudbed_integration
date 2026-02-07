import { AppLogger } from '@hostelworld/common';
import { NotificationsService } from './notifications.service';
export declare class ConsumerService {
    private readonly logger;
    private readonly notificationsService;
    constructor(logger: AppLogger, notificationsService: NotificationsService);
    handleNotificationRequested(payload: unknown): Promise<void>;
}
