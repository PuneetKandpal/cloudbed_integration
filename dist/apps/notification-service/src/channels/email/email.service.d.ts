import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { EmailPayload } from './email.interface';
export declare class EmailService {
    private readonly logger;
    constructor(logger: AppLogger);
    send(payload: EmailPayload): Promise<ChannelResult>;
}
