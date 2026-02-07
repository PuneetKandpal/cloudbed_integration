import { Model } from 'mongoose';
import { AppLogger } from '@hostelworld/common';
import { NotificationStateDocument } from './schemas/notification-state.schema';
import { EmailService } from './channels/email/email.service';
import { SmsService } from './channels/sms/sms.service';
import { PushService } from './channels/push/push.service';
export declare class NotificationsService {
    private readonly notificationStateModel;
    private readonly logger;
    private readonly emailService;
    private readonly smsService;
    private readonly pushService;
    constructor(notificationStateModel: Model<NotificationStateDocument>, logger: AppLogger, emailService: EmailService, smsService: SmsService, pushService: PushService);
}
