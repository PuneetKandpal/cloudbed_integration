import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NotificationStateDocument = NotificationState & Document;

@Schema({ timestamps: true, collection: 'notification_states' })
export class NotificationState {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  channel: string;

  @Prop({ default: 'pending' })
  status: string;

  @Prop()
  subject?: string;

  @Prop()
  body?: string;

  @Prop()
  sentAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const NotificationStateSchema = SchemaFactory.createForClass(NotificationState);
