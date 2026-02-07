import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { PushPayload } from './push.interface';
export declare class PushService {
    private readonly logger;
    constructor(logger: AppLogger);
    send(payload: PushPayload): Promise<ChannelResult>;
}
