import { ChannelPayload } from '../base/channel.interface';
export interface SmsPayload extends ChannelPayload {
    to?: string;
    from?: string;
}
