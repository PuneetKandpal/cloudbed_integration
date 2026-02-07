import { Injectable } from '@nestjs/common';
import { CloudbedsParserService } from './cloudbeds.parser.service';
import { CloudbedsSourceDetectorService } from './cloudbeds.source-detector.service';
import { CloudbedsPublisher } from '../publishers/cloudbeds.publisher';

@Injectable()
export class CloudbedsService {
  constructor(
    private readonly parser: CloudbedsParserService,
    private readonly sourceDetector: CloudbedsSourceDetectorService,
    private readonly publisher: CloudbedsPublisher,
  ) {}

  async handleWebhook(payload: any) {
    const booking = this.parser.parseBooking(payload);
    const detectedSource = this.sourceDetector.detect(booking.source);

    const event = {
      eventType: 'BOOKING_RECEIVED',
      source: detectedSource,
      reservationId: booking.reservationId,
      checkInDate: booking.checkInDate,
      checkOutDate: booking.checkOutDate,
      timestamp: new Date().toISOString(),
      rawPayload: booking.rawPayload,
    };

    await this.publisher.publishBookingReceived(event);

    return event;
  }
}
