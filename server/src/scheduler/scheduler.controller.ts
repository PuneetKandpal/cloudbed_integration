import { Controller, Post, Headers, HttpCode, HttpStatus, Body } from '@nestjs/common';
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

  @Post('run/send-payment-link')
  @HttpCode(HttpStatus.ACCEPTED)
  async runSendPaymentLink(
    @Body() body: { bookingId?: string; reservationId?: string },
    @Headers('x-request-id') requestId?: string,
  ) {
    const resolvedRequestId = requestId ?? `manual-payment-link-${Date.now()}`;

    const booking = await this.schedulerService.findBookingForAdminCancellation({
      bookingId: body?.bookingId,
      reservationId: body?.reservationId,
    });

    if (!booking) {
      return { ok: false, requestId: resolvedRequestId, error: 'bookingId or reservationId not found' };
    }

    const result = await this.schedulerService.sendPaymentLinkForBooking(
      booking.id,
      resolvedRequestId,
    );

    return { ok: result.sent, requestId: resolvedRequestId, job: 'sendPaymentLinkForBooking', result };
  }

  @Post('run/request-admin-cancellation')
  @HttpCode(HttpStatus.ACCEPTED)
  async runRequestAdminCancellation(
    @Body() body: { bookingId?: string; reservationId?: string; force?: boolean },
    @Headers('x-request-id') requestId?: string,
  ) {
    const resolvedRequestId = requestId ?? `manual-admin-cancel-${Date.now()}`;

    const booking = await this.schedulerService.findBookingForAdminCancellation({
      bookingId: body?.bookingId,
      reservationId: body?.reservationId,
    });

    if (!booking) {
      return { ok: false, requestId: resolvedRequestId, error: 'bookingId or reservationId not found' };
    }

    const result = await this.schedulerService.requestAdminCancellationForBooking(
      booking.id,
      resolvedRequestId,
      { force: Boolean(body?.force) },
    );

    return { ok: true, requestId: resolvedRequestId, job: 'requestAdminCancellationForBooking', result };
  }
}
