import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { SmsPayload } from './sms.interface';
export declare class SmsService {
    private readonly logger;
    constructor(logger: AppLogger);
    send(payload: SmsPayload): Promise<ChannelResult>;
}
