export declare class SubReservationDto {
    id: string;
    roomId?: string;
}
export declare class ActorDto {
    type: string;
    id: string;
}
export declare class CloudbedWebhookDto {
    event: string;
    version: string;
    timestamp: number;
    propertyID_str: string;
    propertyID: number;
}
export declare class ReservationWebhookDto extends CloudbedWebhookDto {
    reservationID: string;
    startDate: string;
    endDate: string;
    subReservations: SubReservationDto[];
}
export declare class ReservationStatusChangedDto extends CloudbedWebhookDto {
    reservationID: string;
    status: string;
    previousStatus: string;
    actor: ActorDto;
    subReservations: SubReservationDto[];
}
export declare class ReservationAccommodationStatusDto extends CloudbedWebhookDto {
    reservationId: string;
    status: string;
    roomId: string;
}
export declare class ReservationAccommodationChangedDto extends CloudbedWebhookDto {
    reservationId: string;
    subReservationId: string;
    roomId: string;
    roomIdPrev?: string;
}
export declare class GuestWebhookDto extends CloudbedWebhookDto {
    guestId_str: string;
    guestId: number;
}
