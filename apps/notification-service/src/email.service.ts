import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Injectable()
export class EmailService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('EmailService');
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    this.logger.log(`Sending email to ${to} with subject: ${subject}`);

    // Mock email sending
    console.log(`📧 EMAIL TO: ${to}`);
    console.log(`📧 SUBJECT: ${subject}`);
    console.log(`📧 BODY: ${body}`);

    await new Promise(resolve => setTimeout(resolve, 100));

    this.logger.log(`Email sent successfully to ${to}`);
  }
}
