import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLogger } from '@hostelworld/common';
import { NotificationState, NotificationStateDocument } from './schemas/notification-state.schema';
import { EmailService } from './channels/email/email.service';
import { SmsService } from './channels/sms/sms.service';
import { PushService } from './channels/push/push.service';

/**
 * Core notification business logic.
 * Delegates delivery to channel services (email, sms, push).
 * TODO: Implement routing by channel, persist state, emit sent/failed events.
 */
@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(NotificationState.name) private readonly notificationStateModel: Model<NotificationStateDocument>,
    private readonly logger: AppLogger,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {
    this.logger.setContext(NotificationsService.name);
  }

  // TODO: send(payload): route by channel, call email/sms/push service, save state, publish result
}
