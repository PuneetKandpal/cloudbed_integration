import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { LoggerModule } from '../../../libs/logger/src/logger.module'; // 👈 ADD THIS
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [
    LoggerModule, // 👈 MUST be first or near top
    CommonModule,
    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.BOOKING_DB_NAME ?? 'booking_db',
    }),
    BookingModule,
  ],
})
export class AppModule {}
