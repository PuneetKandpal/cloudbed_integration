import { PrismaService } from '../prisma/prisma.service';
import { BookingService } from '../booking/booking.service';
export declare class WebhookService {
    private readonly prisma;
    private readonly bookingService;
    private readonly logger;
    constructor(prisma: PrismaService, bookingService: BookingService);
    processWebhook(payload: any, headers: any, requestId: string): Promise<void>;
    private handleReservationCreated;
    private handleReservationStatusChanged;
    private handleAccommodationStatusChanged;
    private handleAccommodationChanged;
    private handleGuestCreated;
    private handleGuestUpdated;
    private createAuditLog;
}
