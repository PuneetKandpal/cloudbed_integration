import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class AuditService {
  constructor(
    @InjectModel('BookingAudit')
    private readonly auditModel: Model<any>,
  ) {}

  /**
   * Generic entry point for ALL events
   */
  async recordEvent(
    eventName: string,
    payload: any,
    source: string,
    correlationId?: string | null,
  ) {
    console.log(`💾 Recording audit event: ${eventName}`);

    await this.auditModel.create({
      eventType: eventName,
      source,
      correlationId: correlationId || null,

      guest: {
        firstName:
          payload.rawPayload?.data?.reservation?.guests?.[0]?.firstName || null,
        lastName:
          payload.rawPayload?.data?.reservation?.guests?.[0]?.lastName || null,
        email: null,
      },

      booking: {
        reservationId: payload.reservationId || null,
        checkInDate: payload.checkInDate || null,
        checkOutDate: payload.checkOutDate || null,
        status:
          payload.rawPayload?.data?.reservation?.status || null,
      },

      payment: {
        status: 'NOT_ATTEMPTED',
        attempts: [],
        paymentLink: null,
      },

      pricing: {
        totalAmount:
          payload.rawPayload?.data?.reservation?.totalAmount || null,
        currency:
          payload.rawPayload?.data?.reservation?.currency || null,
        promotions: [],
      },

      financial: {
        grossAmount:
          payload.rawPayload?.data?.reservation?.totalAmount || null,
        netAmount: null,
        tax: null,
      },

      communications: {
        emails: [],
      },

      rawPayload: payload.rawPayload,

      timestamps: {
        eventReceivedAt: payload.timestamp || new Date().toISOString(),
        storedAt: new Date().toISOString(),
      },
    });

    console.log('✅ Audit record stored successfully');
  }
}
