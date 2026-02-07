import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true, collection: 'bookings' })
export class Booking {
  @Prop({ required: true, unique: true })
  externalId: string;

  @Prop({ required: true })
  propertyId: string;

  @Prop({ required: true })
  guestName: string;

  @Prop({ required: true })
  checkIn: Date;

  @Prop({ required: true })
  checkOut: Date;

  @Prop({ default: 'active' })
  status: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
