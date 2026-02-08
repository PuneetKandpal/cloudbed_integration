import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    CommonModule,

    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.PAYMENT_DB_NAME ?? 'payment_db',
    }),

    PaymentModule,
  ],
})
export class AppModule {}
