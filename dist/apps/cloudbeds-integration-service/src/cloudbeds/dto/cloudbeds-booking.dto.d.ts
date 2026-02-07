export interface CloudbedsBookingDto {
    reservationId: string;
    source: string;
    checkInDate: string;
    checkOutDate: string;
    guestName?: string;
    rawPayload: any;
}
