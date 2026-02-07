import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentStateDocument = PaymentState & Document;

@Schema({ timestamps: true, collection: 'payment_states' })
export class PaymentState {
  @Prop({ required: true })
  bookingId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 'pending' })
  status: string;

  @Prop()
  currency: string;

  @Prop()
  policyDecision?: string;
}

export const PaymentStateSchema = SchemaFactory.createForClass(PaymentState);
