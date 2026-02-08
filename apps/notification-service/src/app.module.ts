import { Module } from '@nestjs/common';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { getRabbitMQOptions } from './rabbitmq.options';
import { NotificationModule } from './notification/notification.module';
import { CommonModule } from '@hostelworld/common';

@Module({
  imports: [
    CommonModule,
    RabbitMQModule.forRoot(getRabbitMQOptions()),
    NotificationModule,
  ],
})
export class AppModule {}
