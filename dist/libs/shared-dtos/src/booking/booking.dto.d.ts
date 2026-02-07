export interface BookingCreateDto {
    externalId: string;
    propertyId: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
}
export interface BookingUpdateDto extends Partial<BookingCreateDto> {
    id: string;
}
export interface BookingResponseDto {
    id: string;
    externalId: string;
    propertyId: string;
    guestName: string;
    checkIn: string;
    checkOut: string;
    createdAt: string;
    updatedAt: string;
}
