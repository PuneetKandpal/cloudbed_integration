import { ChannelPayload } from '../base/channel.interface';

export interface EmailPayload extends ChannelPayload {
  to?: string;
  replyTo?: string;
}

export interface EmailOptions {
  from?: string;
  templateId?: string;
}
