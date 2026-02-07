import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from './audit/audit.module';
import { LoggerModule } from '../../../libs/logger/src/logger.module'; // 👈 ADD THIS

@Module({
  imports: [
    LoggerModule,
    MongooseModule.forRoot(
      process.env.MONGO_URI ||
        'mongodb://127.0.0.1:27017/hostelworld_audit',
    ),
    AuditModule,
  ],
})
export class AppModule {}
