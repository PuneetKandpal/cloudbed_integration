import { Injectable } from '@nestjs/common';

@Injectable()
export class BookingPolicyService {
  evaluate(booking: any) {
    const now = new Date();
    const checkIn = new Date(booking.checkInDate);

    const hoursToCheckin =
      (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (booking.policy === 'NON_REFUNDABLE') {
      return 'PAY_NOW';
    }

    if (booking.policy === 'FLEXIBLE' && hoursToCheckin <= 48) {
      return 'PAY_NOW';
    }

    return 'WAIT';
  }
}
