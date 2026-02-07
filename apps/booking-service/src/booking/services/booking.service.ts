import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppLogger } from '@hostelworld/common';
import { Booking, BookingDocument } from '../schemas/booking.schema';

/**
 * Core booking business logic.
 * TODO: Implement create/update/cancel from Cloudbeds webhook payloads.
 */
@Injectable()
export class BookingService {
  constructor(
    @InjectModel(Booking.name) private readonly bookingModel: Model<BookingDocument>,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext(BookingService.name);
  }

  // TODO: createFromWebhook(payload), update, cancel, findById, findByExternalId
}
