import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { LoggerModule } from '../../../libs/logger/src/logger.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    LoggerModule,       // ✅ Logger available globally
    CommonModule,       // ✅ RabbitMQ + interceptors
    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.PAYMENT_DB_NAME ?? 'payment_db',
    }),
    PaymentModule,      // ✅ Business logic
  ],
})
export class AppModule {}
