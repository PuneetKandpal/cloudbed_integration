"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerController = void 0;
const common_1 = require("@nestjs/common");
const scheduler_service_1 = require("./scheduler.service");
let SchedulerController = class SchedulerController {
    schedulerService;
    constructor(schedulerService) {
        this.schedulerService = schedulerService;
    }
    async runMonitorFlexible(requestId) {
        await this.schedulerService.monitorFlexibleBookings();
        return { ok: true, requestId: requestId ?? null, job: 'monitorFlexibleBookings' };
    }
    async runProcessNonRefundable(requestId) {
        await this.schedulerService.processNonRefundableBookings();
        return { ok: true, requestId: requestId ?? null, job: 'processNonRefundableBookings' };
    }
    async runProcessRetries(requestId) {
        await this.schedulerService.processPaymentRetries();
        return { ok: true, requestId: requestId ?? null, job: 'processPaymentRetries' };
    }
    async runSendReminders(requestId) {
        await this.schedulerService.sendPaymentReminders();
        return { ok: true, requestId: requestId ?? null, job: 'sendPaymentReminders' };
    }
    async runRequestAdminCancellation(body, requestId) {
        const resolvedRequestId = requestId ?? `manual-admin-cancel-${Date.now()}`;
        const booking = await this.schedulerService.findBookingForAdminCancellation({
            bookingId: body?.bookingId,
            reservationId: body?.reservationId,
        });
        if (!booking) {
            return { ok: false, requestId: resolvedRequestId, error: 'bookingId or reservationId not found' };
        }
        const result = await this.schedulerService.requestAdminCancellationForBooking(booking.id, resolvedRequestId, { force: Boolean(body?.force) });
        return { ok: true, requestId: resolvedRequestId, job: 'requestAdminCancellationForBooking', result };
    }
};
exports.SchedulerController = SchedulerController;
__decorate([
    (0, common_1.Post)('run/monitor-flexible'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "runMonitorFlexible", null);
__decorate([
    (0, common_1.Post)('run/process-non-refundable'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "runProcessNonRefundable", null);
__decorate([
    (0, common_1.Post)('run/process-retries'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "runProcessRetries", null);
__decorate([
    (0, common_1.Post)('run/send-reminders'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "runSendReminders", null);
__decorate([
    (0, common_1.Post)('run/request-admin-cancellation'),
    (0, common_1.HttpCode)(common_1.HttpStatus.ACCEPTED),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-request-id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SchedulerController.prototype, "runRequestAdminCancellation", null);
exports.SchedulerController = SchedulerController = __decorate([
    (0, common_1.Controller)('scheduler'),
    __metadata("design:paramtypes", [scheduler_service_1.SchedulerService])
], SchedulerController);
//# sourceMappingURL=scheduler.controller.js.map