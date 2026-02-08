import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [
    CommonModule,

    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.BOOKING_DB_NAME ?? 'booking_db',
    }),

    BookingModule,
  ],
})
export class AppModule {}
