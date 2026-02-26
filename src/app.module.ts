import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { WebhookModule } from './webhook/webhook.module';
import { BookingModule } from './booking/booking.module';
import { CloudbedModule } from './cloudbed/cloudbed.module';
import { PaymentModule } from './payment/payment.module';
import { RiskModule } from './risk/risk.module';
import { EmailModule } from './email/email.module';
import { CancellationPolicyModule } from './cancellation-policy/cancellation-policy.module';
import { SchedulerModule as AppSchedulerModule } from './scheduler/scheduler.module';
import { OccupancyModule } from './occupancy/occupancy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    WebhookModule,
    BookingModule,
    CloudbedModule,
    PaymentModule,
    RiskModule,
    EmailModule,
    CancellationPolicyModule,
    AppSchedulerModule,
    OccupancyModule,
  ],
})
export class AppModule {}
