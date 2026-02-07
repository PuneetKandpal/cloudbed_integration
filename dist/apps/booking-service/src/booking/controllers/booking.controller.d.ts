import { BookingService } from '../services/booking.service';
export declare class BookingController {
    private readonly bookingService;
    constructor(bookingService: BookingService);
    handleBookingWebhook(payload: unknown): Promise<{
        received: boolean;
    }>;
}
