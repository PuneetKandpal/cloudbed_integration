import { Injectable } from '@nestjs/common';
import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { SmsPayload } from './sms.interface';

/**
 * SMS notification channel.
 * TODO: Integrate with SMS provider (Twilio, SNS, etc.); implement send().
 */
@Injectable()
export class SmsService {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(SmsService.name);
  }

  async send(payload: SmsPayload): Promise<ChannelResult> {
    // TODO: Call SMS provider API, return { success, externalId } or { success: false, error }
    this.logger.log('SMS send placeholder', undefined);
    return { success: true };
  }
}
