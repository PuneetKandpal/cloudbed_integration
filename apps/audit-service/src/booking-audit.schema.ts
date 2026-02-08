import { Schema } from 'mongoose';

export const BookingAuditSchema = new Schema(
  {
    eventType: String,
    source: String,
    correlationId: String,

    guest: Object,
    booking: Object,
    payment: Object,
    pricing: Object,
    financial: Object,
    communications: Object,

    rawPayload: Object,

    timestamps: Object,
  },
  {
    strict: false, // allow flexible JSON
  },
);
