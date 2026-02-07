import { Injectable } from '@nestjs/common';
import { CloudbedsBookingDto } from '../dto/cloudbeds-booking.dto';

@Injectable()
export class CloudbedsParserService {
  parseBooking(payload: any): CloudbedsBookingDto {
    return {
      reservationId:
        payload.reservationId ||
        payload.id ||
        payload.reservation_id ||
        'UNKNOWN',

      source:
        payload.source ||
        payload.channel ||
        payload.bookingSource ||
        'UNKNOWN',

      checkInDate:
        payload.checkIn ||
        payload.check_in ||
        payload.arrivalDate ||
        '',

      checkOutDate:
        payload.checkOut ||
        payload.check_out ||
        payload.departureDate ||
        '',

      guestName:
        payload.guest?.name ||
        payload.guestName ||
        undefined,

      rawPayload: payload,
    };
  }
}
