import { BaseEvent } from './event.interface';

export interface BookingCreatedPayload {
  bookingId: string;
  externalId: string;
  propertyId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
}

export type BookingCreatedEvent = BaseEvent<BookingCreatedPayload>;

export interface BookingUpdatedPayload extends BookingCreatedPayload {
  changes: Record<string, unknown>;
}

export type BookingUpdatedEvent = BaseEvent<BookingUpdatedPayload>;

export interface BookingCancelledPayload {
  bookingId: string;
  reason?: string;
}

export type BookingCancelledEvent = BaseEvent<BookingCancelledPayload>;
