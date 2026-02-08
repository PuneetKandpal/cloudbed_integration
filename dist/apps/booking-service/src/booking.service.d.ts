import { Model } from 'mongoose';
import { LoggerService } from './logger.service';
import { BookingDocument } from './booking.schema';
export declare class BookingService {
    private readonly bookingModel;
    private readonly logger;
    constructor(bookingModel: Model<BookingDocument>, logger: LoggerService);
}
