import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuditConsumer } from './consumers/audit.consumer';
import { AuditService } from './services/audit.service';
import { S3Service } from './services/s3.service';
import { BookingAuditSchema } from './schemas/booking-audit.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'BookingAudit', schema: BookingAuditSchema },
    ]),
  ],
  controllers: [AuditConsumer],   // ✅ FIX IS HERE
  providers: [AuditService, S3Service],
})
export class AuditModule {}
