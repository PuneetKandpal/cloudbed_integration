import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { BookingPolicyModule } from './booking-policy/booking-policy.module';

@Module({
  imports: [
    CommonModule,

    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.PAYMENT_POLICY_DB_NAME ?? 'payment_policy_db',
    }),

    BookingPolicyModule,
  ],
})
export class AppModule {}
