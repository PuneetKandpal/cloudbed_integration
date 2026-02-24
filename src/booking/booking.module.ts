import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { CloudbedModule } from '../cloudbed/cloudbed.module';
import { PaymentModule } from '../payment/payment.module';
import { RiskModule } from '../risk/risk.module';
import { CancellationPolicyModule } from '../cancellation-policy/cancellation-policy.module';

@Module({
  imports: [CloudbedModule, PaymentModule, RiskModule, CancellationPolicyModule],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
