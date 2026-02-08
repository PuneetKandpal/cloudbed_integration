import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuditConsumer } from '../audit.consumer';
import { AuditService } from '../audit.service';
import { S3Service } from '../s3.service';
import { BookingAuditSchema } from '../booking-audit.schema';

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
