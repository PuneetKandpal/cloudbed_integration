import { EmailService } from './email.service';
import { LoggerService } from './logger.service';
export declare class NotificationConsumer {
    private readonly emailService;
    private readonly logger;
    constructor(emailService: EmailService, logger: LoggerService);
    bookingConfirmed(data: any): Promise<void>;
    paymentFailed(data: any): Promise<void>;
    bookingCancelled(data: any): Promise<void>;
}
