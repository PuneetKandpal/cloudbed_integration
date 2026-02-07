import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { AuditService } from '../services/audit.service';

@Controller()
export class AuditConsumer {
  constructor(private readonly auditService: AuditService) {
    console.log('🟢 AuditConsumer initialized');
  }

  @EventPattern('BOOKING_RECEIVED')
  async handleBookingReceived(@Payload() event: any) {
    console.log('📥 AuditService received BOOKING_RECEIVED');
    console.log(event);

    await this.auditService.recordEvent(
      'BOOKING_RECEIVED',                    // eventName
      event,                                 // payload
      event.source || 'cloudbeds-service',   // source
      event.correlationId || null,           // correlationId
    );
  }
}
