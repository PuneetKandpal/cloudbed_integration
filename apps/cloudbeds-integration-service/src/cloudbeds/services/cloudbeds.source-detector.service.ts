import { Injectable } from '@nestjs/common';
import { BookingSource } from '../constants/booking-source.constants';

@Injectable()
export class CloudbedsSourceDetectorService {
  detect(source: string): BookingSource {
    if (!source) return BookingSource.OTHER;

    if (source.toLowerCase().includes('hostelworld')) {
      return BookingSource.HOSTELWORLD;
    }

    if (source.toLowerCase().includes('direct')) {
      return BookingSource.DIRECT;
    }

    return BookingSource.OTHER;
  }
}
