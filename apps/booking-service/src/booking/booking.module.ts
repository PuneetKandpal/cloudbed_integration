import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingSchema } from '../booking.schema';
import { BookingService } from '../booking.service';
import { BookingController } from '../booking.controller';
import { BookingConsumer } from '../booking.consumer';
import { BookingPublisher } from '../booking.publisher';
import { LoggerService } from '../logger.service';   // 👈 local logger

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Booking', schema: BookingSchema }]),
  ],
  controllers: [BookingController, BookingConsumer],
  providers: [
    BookingService,
    BookingPublisher,
    LoggerService,   // 👈 provide local logger
  ],
  exports: [BookingService, BookingPublisher],
})
export class BookingModule {}
