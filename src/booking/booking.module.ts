import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CloudbedModule } from '../cloudbed/cloudbed.module';
import { PaymentModule } from '../payment/payment.module';
import { RiskModule } from '../risk/risk.module';

@Module({
  imports: [CloudbedModule, PaymentModule, RiskModule],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
