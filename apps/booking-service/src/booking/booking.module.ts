import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingSchema } from './schemas/booking.schema';
import { BookingService } from './services/booking.service';
import { BookingController } from './controllers/booking.controller';
import { BookingConsumer } from './consumers/booking.consumer';
import { BookingPublisher } from './publishers/booking.publisher';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
  ],
  controllers: [BookingController, BookingConsumer],
  providers: [BookingService, BookingPublisher],
  exports: [BookingService, BookingPublisher],
})
export class BookingModule {}
