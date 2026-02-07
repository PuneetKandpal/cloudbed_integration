import { Model } from 'mongoose';
import { AppLogger } from '@hostelworld/common';
import { BookingDocument } from '../schemas/booking.schema';
export declare class BookingService {
    private readonly bookingModel;
    private readonly logger;
    constructor(bookingModel: Model<BookingDocument>, logger: AppLogger);
}
