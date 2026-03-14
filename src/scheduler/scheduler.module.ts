import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentModule } from '../payment/payment.module';
import { EmailModule } from '../email/email.module';
import { RiskModule } from '../risk/risk.module';
import { OccupancyModule } from '../occupancy/occupancy.module';
import { CloudbedModule } from '../cloudbed/cloudbed.module';

@Module({
  imports: [PrismaModule, PaymentModule, EmailModule, RiskModule, OccupancyModule, CloudbedModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
