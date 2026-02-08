import { BookingService } from './booking.service';
export declare class BookingController {
    private readonly bookingService;
    constructor(bookingService: BookingService);
    handleBookingWebhook(payload: unknown): Promise<{
        received: boolean;
    }>;
}
