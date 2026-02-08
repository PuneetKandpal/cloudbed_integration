import { Module } from '@nestjs/common';
import { EmailService } from '../email.service';
import { NotificationConsumer } from '../notification.consumer';

@Module({
  providers: [EmailService, NotificationConsumer],
})
export class NotificationModule {}
