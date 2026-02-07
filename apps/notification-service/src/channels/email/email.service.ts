import { Injectable } from '@nestjs/common';
import { AppLogger } from '@hostelworld/common';
import { ChannelResult } from '../base/channel.interface';
import { EmailPayload } from './email.interface';

/**
 * Email notification channel.
 * TODO: Integrate with email provider (SendGrid, SES, etc.); implement send().
 */
@Injectable()
export class EmailService {
  constructor(private readonly logger: AppLogger) {
    this.logger.setContext(EmailService.name);
  }

  async send(payload: EmailPayload): Promise<ChannelResult> {
    // TODO: Call email provider API, return { success, externalId } or { success: false, error }
    this.logger.log('Email send placeholder', undefined);
    return { success: true };
  }
}
