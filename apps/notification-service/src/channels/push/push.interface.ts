import { ChannelPayload } from '../base/channel.interface';

export interface PushPayload extends ChannelPayload {
  deviceToken?: string;
  topic?: string;
  badge?: number;
  data?: Record<string, string>;
}
