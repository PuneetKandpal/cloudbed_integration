import { Injectable } from '@nestjs/common';
import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { PushPayload } from './push.interface';

/**
 * Push notification channel (FCM, APNs, etc.).
 * TODO: Integrate with push provider; implement send().
 */
@Injectable()
export class PushService {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(PushService.name);
  }

  async send(payload: PushPayload): Promise<ChannelResult> {
    // TODO: Call push provider API, return { success, externalId } or { success: false, error }
    this.logger.log('Push send placeholder', undefined);
    return { success: true };
  }
}
