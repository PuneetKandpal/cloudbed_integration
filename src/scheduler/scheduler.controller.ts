import { Controller, Post, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  @Post('run/monitor-flexible')
  @HttpCode(HttpStatus.ACCEPTED)
  async runMonitorFlexible(@Headers('x-request-id') requestId?: string) {
    await this.schedulerService.monitorFlexibleBookings();
    return { ok: true, requestId: requestId ?? null, job: 'monitorFlexibleBookings' };
  }

  @Post('run/process-non-refundable')
  @HttpCode(HttpStatus.ACCEPTED)
  async runProcessNonRefundable(@Headers('x-request-id') requestId?: string) {
    await this.schedulerService.processNonRefundableBookings();
    return { ok: true, requestId: requestId ?? null, job: 'processNonRefundableBookings' };
  }

  @Post('run/process-retries')
  @HttpCode(HttpStatus.ACCEPTED)
  async runProcessRetries(@Headers('x-request-id') requestId?: string) {
    await this.schedulerService.processPaymentRetries();
    return { ok: true, requestId: requestId ?? null, job: 'processPaymentRetries' };
  }

  @Post('run/send-reminders')
  @HttpCode(HttpStatus.ACCEPTED)
  async runSendReminders(@Headers('x-request-id') requestId?: string) {
    await this.schedulerService.sendPaymentReminders();
    return { ok: true, requestId: requestId ?? null, job: 'sendPaymentReminders' };
  }
}
