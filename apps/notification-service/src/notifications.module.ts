import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationStateSchema } from './schemas/notification-state.schema';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ConsumerService } from './consumer.service';
import { ProducerService } from './producer.service';
import { EmailModule } from './channels/email/email.module';
import { SmsModule } from './channels/sms/sms.module';
import { PushModule } from './channels/push/push.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'NotificationState', schema: NotificationStateSchema }]),
    EmailModule,
    SmsModule,
    PushModule,
  ],
  controllers: [NotificationsController, ConsumerService],
  providers: [NotificationsService, ProducerService],
  exports: [NotificationsService, ProducerService],
})
export class NotificationsModule {}
