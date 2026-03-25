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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const payment_service_1 = require("../payment/payment.service");
const email_service_1 = require("../email/email.service");
const risk_assessment_service_1 = require("../risk/risk-assessment.service");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const date_fns_tz_1 = require("date-fns-tz");
const occupancy_service_1 = require("../occupancy/occupancy.service");
const cloudbed_api_service_1 = require("../cloudbed/cloudbed-api.service");
let SchedulerService = class SchedulerService {
    prisma;
    paymentService;
    emailService;
    riskService;
    occupancyService;
    cloudbedApi;
    logger = new logger_service_1.LoggerService('SchedulerService');
    constructor(prisma, paymentService, emailService, riskService, occupancyService, cloudbedApi) {
        this.prisma = prisma;
        this.paymentService = paymentService;
        this.emailService = emailService;
        this.riskService = riskService;
        this.occupancyService = occupancyService;
        this.cloudbedApi = cloudbedApi;
    }
    async resolvePropertyTimeZone(propertyId) {
        const rawPropertyId = String(propertyId ?? '').trim();
        if (rawPropertyId) {
            try {
                const record = await this.prisma.propertyTimeZone.findUnique({
                    where: { propertyId: rawPropertyId },
                });
                const fromDb = String(record?.timeZone ?? '').trim();
                if (fromDb) {
                    return fromDb;
                }
            }
            catch (error) {
                this.logger.logWarn('Failed to resolve property timezone from DB; falling back to env/default', 'SchedulerService', 'resolvePropertyTimeZone', this.logger.generateRequestId(), { propertyId: rawPropertyId, error });
            }
        }
        const byPropertyKey = rawPropertyId
            ? process.env[`PROPERTY_TIMEZONE_${rawPropertyId}`]
            : undefined;
        const tz = String(byPropertyKey ?? process.env.PROPERTY_TIMEZONE_DEFAULT ?? 'UTC').trim();
        return tz || 'UTC';
    }
    async monitorFlexibleBookings() {
        const requestId = `scheduler-flexible-${Date.now()}`;
        this.logger.logInfo('Starting flexible bookings monitoring job', 'SchedulerService', 'monitorFlexibleBookings', requestId, {});
        try {
            const now = new Date();
            const flexibleBookings = await this.prisma.booking.findMany({
                where: {
                    policyType: client_1.BookingPolicyType.FLEXIBLE,
                    status: client_1.BookingStatus.CREATED,
                    cancellationDeadline: {
                        lte: now,
                    },
                    remainingBalance: {
                        gt: 0,
                    },
                    payments: {
                        none: {},
                    },
                },
                include: {
                    payments: {
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    riskAssessments: {
                        orderBy: { assessedAt: 'desc' },
                        take: 1,
                    },
                },
            });
            this.logger.logInfo('Found flexible bookings past cancellation deadline', 'SchedulerService', 'monitorFlexibleBookings', requestId, { count: flexibleBookings.length });
            for (const booking of flexibleBookings) {
                await this.processFlexibleBookingPayment(booking, requestId);
            }
            this.logger.logInfo('Completed flexible bookings monitoring job', 'SchedulerService', 'monitorFlexibleBookings', requestId, { processedCount: flexibleBookings.length });
        }
        catch (error) {
            this.logger.logError('Failed to monitor flexible bookings', 'SchedulerService', 'monitorFlexibleBookings', error, requestId);
        }
    }
    async processNonRefundableBookings() {
        const requestId = `scheduler-nonrefundable-${Date.now()}`;
        this.logger.logInfo('Starting non-refundable bookings processing job', 'SchedulerService', 'processNonRefundableBookings', requestId, {});
        try {
            const nonRefundableBookings = await this.prisma.booking.findMany({
                where: {
                    policyType: client_1.BookingPolicyType.NON_REFUNDABLE,
                    status: client_1.BookingStatus.CREATED,
                    remainingBalance: {
                        gt: 0,
                    },
                    payments: {
                        none: {},
                    },
                },
                include: {
                    riskAssessments: {
                        orderBy: { assessedAt: 'desc' },
                        take: 1,
                    },
                },
            });
            this.logger.logInfo('Found non-refundable bookings requiring payment', 'SchedulerService', 'processNonRefundableBookings', requestId, { count: nonRefundableBookings.length });
            for (const booking of nonRefundableBookings) {
                await this.initiatePaymentWorkflow(booking, requestId);
            }
            this.logger.logInfo('Completed non-refundable bookings processing job', 'SchedulerService', 'processNonRefundableBookings', requestId, { processedCount: nonRefundableBookings.length });
        }
        catch (error) {
            this.logger.logError('Failed to process non-refundable bookings', 'SchedulerService', 'processNonRefundableBookings', error, requestId);
        }
    }
    async processPaymentRetries() {
        const requestId = `scheduler-retries-${Date.now()}`;
        this.logger.logInfo('Starting payment retries processing job', 'SchedulerService', 'processPaymentRetries', requestId, {});
        try {
            const now = new Date();
            const bookingsForRetry = await this.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.CREATED,
                    remainingBalance: {
                        gt: 0,
                    },
                    payments: {
                        some: {
                            status: client_1.PaymentStatus.FAILED,
                        },
                    },
                },
                include: {
                    payments: {
                        where: { status: client_1.PaymentStatus.FAILED },
                        orderBy: { createdAt: 'desc' },
                        take: 1,
                    },
                    riskAssessments: {
                        orderBy: { assessedAt: 'desc' },
                        take: 1,
                    },
                },
            });
            this.logger.logInfo('Found bookings with failed payments', 'SchedulerService', 'processPaymentRetries', requestId, { count: bookingsForRetry.length });
            for (const booking of bookingsForRetry) {
                const lastPayment = booking.payments[0];
                const riskAssessment = booking.riskAssessments[0];
                if (!lastPayment)
                    continue;
                const hoursSinceFailure = (0, date_fns_1.differenceInHours)(now, lastPayment.createdAt);
                const isRisky = riskAssessment?.riskLevel === client_1.RiskLevel.HIGH ||
                    riskAssessment?.riskLevel === client_1.RiskLevel.CRITICAL;
                const retryThreshold = isRisky ? 2 : 24;
                if (hoursSinceFailure >= retryThreshold) {
                    this.logger.logInfo('Processing payment retry', 'SchedulerService', 'processPaymentRetries', requestId, {
                        bookingId: booking.id,
                        reservationId: booking.reservationId,
                        hoursSinceFailure,
                        isRisky,
                        retryThreshold,
                    });
                    await this.retryPayment(booking, riskAssessment, requestId);
                }
            }
            this.logger.logInfo('Completed payment retries processing job', 'SchedulerService', 'processPaymentRetries', requestId);
        }
        catch (error) {
            this.logger.logError('Failed to process payment retries', 'SchedulerService', 'processPaymentRetries', error, requestId);
        }
    }
    async sendPaymentReminders() {
        const requestId = `scheduler-reminders-${Date.now()}`;
        this.logger.logInfo('Starting payment reminders job', 'SchedulerService', 'sendPaymentReminders', requestId, {});
        try {
            const now = new Date();
            const reminderWindow = (0, date_fns_1.addHours)(now, 72);
            const bookingsNeedingReminder = await this.prisma.booking.findMany({
                where: {
                    status: client_1.BookingStatus.CREATED,
                    startDate: {
                        gte: now,
                        lte: reminderWindow,
                    },
                    remainingBalance: {
                        gt: 0,
                    },
                    guestEmail: {
                        not: null,
                    },
                },
            });
            this.logger.logInfo('Found bookings needing payment reminders', 'SchedulerService', 'sendPaymentReminders', requestId, { count: bookingsNeedingReminder.length });
            for (const booking of bookingsNeedingReminder) {
                if (!booking.guestEmail)
                    continue;
                const propertyTimeZone = await this.resolvePropertyTimeZone(booking.propertyId);
                const nowLocalDateOnly = (0, date_fns_tz_1.formatInTimeZone)(now, propertyTimeZone, 'yyyy-MM-dd');
                const checkInLocalDateOnly = (0, date_fns_tz_1.formatInTimeZone)(booking.startDate, propertyTimeZone, 'yyyy-MM-dd');
                const daysUntilCheckIn = (0, date_fns_1.differenceInCalendarDays)((0, date_fns_1.parseISO)(checkInLocalDateOnly), (0, date_fns_1.parseISO)(nowLocalDateOnly));
                if (daysUntilCheckIn < 0 || daysUntilCheckIn > 2) {
                    continue;
                }
                try {
                    await this.emailService.sendPaymentReminder(booking.id, {
                        guestEmail: booking.guestEmail,
                        reservationId: booking.reservationId,
                        propertyName: booking.propertyName || 'Property',
                        startDate: booking.startDate,
                        endDate: booking.endDate,
                        totalAmount: booking.totalAmount.toNumber(),
                        currency: booking.currency,
                        cancellationDeadline: booking.parsedCancellationDeadline || booking.cancellationDeadline || undefined,
                    }, requestId);
                    this.logger.logInfo('Sent payment reminder', 'SchedulerService', 'sendPaymentReminders', requestId, { bookingId: booking.id, reservationId: booking.reservationId });
                }
                catch (error) {
                    this.logger.logError('Failed to send payment reminder', 'SchedulerService', 'sendPaymentReminders', error, requestId, { bookingId: booking.id });
                }
            }
            this.logger.logInfo('Completed payment reminders job', 'SchedulerService', 'sendPaymentReminders', requestId);
        }
        catch (error) {
            this.logger.logError('Failed to send payment reminders', 'SchedulerService', 'sendPaymentReminders', error, requestId);
        }
    }
    async processFlexibleBookingPayment(booking, requestId) {
        this.logger.logInfo('Processing flexible booking payment (deadline passed)', 'SchedulerService', 'processFlexibleBookingPayment', requestId, {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            cancellationDeadline: booking.cancellationDeadline,
        });
        if (!booking.riskAssessments || booking.riskAssessments.length === 0) {
            await this.riskService.assessBookingRisk(booking.id, requestId);
        }
        await this.initiatePaymentWorkflow(booking, requestId);
    }
    async initiatePaymentWorkflow(booking, requestId) {
        this.logger.logInfo('Initiating payment workflow', 'SchedulerService', 'initiatePaymentWorkflow', requestId, { bookingId: booking.id, reservationId: booking.reservationId });
        try {
            const paymentResult = await this.paymentService.authorizePayment(booking.id, booking.remainingBalance.toNumber(), requestId);
            if (paymentResult.success) {
                this.logger.logInfo('Payment authorization Queued successfully', 'SchedulerService', 'initiatePaymentWorkflow', requestId, { bookingId: booking.id });
            }
            else {
                this.logger.logWarn('Payment authorization failed', 'SchedulerService', 'initiatePaymentWorkflow', requestId, { bookingId: booking.id, reason: paymentResult.error });
                const propertyTimeZone = await this.resolvePropertyTimeZone(booking.propertyId);
                const now = new Date();
                const nowLocalDateOnly = (0, date_fns_tz_1.formatInTimeZone)(now, propertyTimeZone, 'yyyy-MM-dd');
                const checkInLocalDateOnly = (0, date_fns_tz_1.formatInTimeZone)(booking.startDate, propertyTimeZone, 'yyyy-MM-dd');
                const daysUntilCheckIn = (0, date_fns_1.differenceInCalendarDays)((0, date_fns_1.parseISO)(checkInLocalDateOnly), (0, date_fns_1.parseISO)(nowLocalDateOnly));
                if (daysUntilCheckIn <= 2) {
                    await this.riskService.assessBookingRisk(booking.id, requestId);
                    const latestRisk = await this.prisma.riskAssessment.findFirst({
                        where: { bookingId: booking.id },
                        orderBy: { assessedAt: 'desc' },
                    });
                    const isRisky = latestRisk?.riskLevel === client_1.RiskLevel.HIGH ||
                        latestRisk?.riskLevel === client_1.RiskLevel.CRITICAL;
                    try {
                        const paymentLink = await this.cloudbedApi.generatePaymentLink({ reservationId: booking.reservationId, propertyId: booking.propertyId }, requestId);
                        if (isRisky && booking.guestEmail) {
                            await this.emailService.sendPaymentLink(booking.id, booking.guestEmail, paymentLink, requestId);
                        }
                        await this.emailService.sendSupportNotification(booking.id, {
                            guestEmail: booking.guestEmail || 'unknown',
                            guestName: undefined,
                            reservationId: booking.reservationId,
                            propertyName: booking.propertyName || 'Property',
                            startDate: booking.startDate,
                            riskLevel: latestRisk?.riskLevel ?? 'UNKNOWN',
                            totalAmount: booking.totalAmount.toNumber(),
                            currency: booking.currency,
                        }, requestId);
                    }
                    catch (error) {
                        this.logger.logWarn('Failed to generate/send payment link/support notification', 'SchedulerService', 'initiatePaymentWorkflow', requestId, { bookingId: booking.id, error: String(error) });
                    }
                }
            }
        }
        catch (error) {
            this.logger.logError('Failed to initiate payment workflow', 'SchedulerService', 'initiatePaymentWorkflow', error, requestId, { bookingId: booking.id });
        }
    }
    async retryPayment(booking, riskAssessment, requestId) {
        this.logger.logInfo('Retrying payment', 'SchedulerService', 'retryPayment', requestId, {
            bookingId: booking.id,
            reservationId: booking.reservationId,
            riskLevel: riskAssessment?.riskLevel,
        });
        try {
            const paymentResult = await this.paymentService.authorizePayment(booking.id, booking.remainingBalance.toNumber(), requestId);
            if (paymentResult.success) {
                this.logger.logInfo('Payment retry successful', 'SchedulerService', 'retryPayment', requestId, { bookingId: booking.id });
                await this.prisma.booking.update({
                    where: { id: booking.id },
                    data: { status: client_1.BookingStatus.CONFIRMED },
                });
            }
            else {
                this.logger.logWarn('Payment retry failed - escalating to manager', 'SchedulerService', 'retryPayment', requestId, { bookingId: booking.id });
                const paymentAttempts = await this.prisma.payment.count({
                    where: { bookingId: booking.id },
                });
                await this.requestAdminCancellationIfThresholdReached(booking.id, paymentAttempts, requestId);
            }
        }
        catch (error) {
            this.logger.logError('Failed to retry payment', 'SchedulerService', 'retryPayment', error, requestId, { bookingId: booking.id });
        }
    }
    async requestAdminCancellationForBooking(bookingId, requestId, options) {
        this.logger.logInfo('Preparing admin cancellation request email', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, force: Boolean(options?.force) });
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking) {
            this.logger.logWarn('Booking not found; cannot send admin cancellation request', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId });
            return { sent: false, recipients: [], reason: 'Booking not found' };
        }
        const propertyTimeZone = await this.resolvePropertyTimeZone(booking.propertyId);
        const checkinDate = (0, date_fns_tz_1.formatInTimeZone)(new Date(booking.startDate), propertyTimeZone, 'yyyy-MM-dd');
        this.logger.logInfo('Resolved check-in date for cancellation request flow', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, {
            bookingId,
            reservationId: booking.reservationId,
            startDate: booking.startDate,
            checkinDate,
        });
        const alreadySent = await this.prisma.email.findFirst({
            where: {
                bookingId,
                emailType: client_1.EmailType.ADMIN_CANCELLATION_REQUEST,
                status: { in: [client_1.EmailStatus.PENDING, client_1.EmailStatus.SENT] },
            },
            select: { id: true },
        });
        if (alreadySent && !options?.force) {
            this.logger.logInfo('Admin cancellation request already sent; skipping', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, alreadySentEmailId: alreadySent.id });
            return { sent: false, recipients: [], reason: 'Already requested' };
        }
        const settings = await this.getPropertyNotificationSetting(booking.propertyId);
        const recipients = this.mergeRecipients(settings?.adminEmails, settings?.supportEmails);
        this.logger.logInfo('Resolved admin/support recipients for cancellation request', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, {
            bookingId,
            propertyId: booking.propertyId,
            recipientsCount: recipients.length,
            recipients,
            configuredThreshold: settings?.cancelRequestAfterFailures ?? null,
        });
        if (recipients.length === 0) {
            this.logger.logWarn('No admin/support recipients configured; skipping admin cancellation request email', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, propertyId: booking.propertyId });
            return { sent: false, recipients: [], reason: 'No recipients configured' };
        }
        const paymentAttempts = await this.prisma.payment.count({ where: { bookingId } });
        this.logger.logInfo('Loaded payment attempts for cancellation request email', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, paymentAttempts });
        let occupancyTotals;
        try {
            const occupancy = await this.occupancyService.getDailyOccupancy({
                propertyId: booking.propertyId,
                date: checkinDate,
                requestId,
            });
            occupancyTotals = {
                occupancyRate: occupancy?.totals?.occupancyRate ?? 0,
                occupiedRooms: occupancy?.totals?.occupiedRooms ?? 0,
                totalRooms: occupancy?.totals?.totalRooms ?? 0,
                blockedRooms: occupancy?.totals?.blockedRooms ?? 0,
            };
            this.logger.logInfo('Fetched occupancy snapshot for cancellation request email', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, propertyId: booking.propertyId, checkinDate }, occupancyTotals);
        }
        catch (error) {
            this.logger.logWarn('Failed to load occupancy for cancellation request email; continuing without it', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, { bookingId, error: String(error) });
        }
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { requiresManagerApproval: true },
        });
        await this.emailService.sendAdminCancellationRequest(bookingId, recipients, {
            reservationId: booking.reservationId,
            guestEmail: booking.guestEmail || 'unknown',
            propertyName: booking.propertyName || 'Property',
            startDate: booking.startDate,
            totalAmount: booking.totalAmount.toNumber(),
            currency: booking.currency,
            paymentAttempts,
            occupancy: occupancyTotals,
        }, requestId);
        this.logger.logInfo('Admin cancellation request email sent', 'SchedulerService', 'requestAdminCancellationForBooking', requestId, {
            bookingId,
            reservationId: booking.reservationId,
            propertyId: booking.propertyId,
            recipientsCount: recipients.length,
        });
        return { sent: true, recipients };
    }
    async findBookingForAdminCancellation(params) {
        if (params.bookingId) {
            return this.prisma.booking.findUnique({
                where: { id: params.bookingId },
                select: { id: true },
            });
        }
        if (params.reservationId) {
            return this.prisma.booking.findUnique({
                where: { reservationId: params.reservationId },
                select: { id: true },
            });
        }
        return null;
    }
    async requestAdminCancellationIfThresholdReached(bookingId, paymentAttempts, requestId) {
        const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking)
            return;
        const settings = await this.getPropertyNotificationSetting(booking.propertyId);
        const threshold = settings?.cancelRequestAfterFailures ?? 2;
        this.logger.logInfo('Evaluating admin cancellation request threshold', 'SchedulerService', 'requestAdminCancellationIfThresholdReached', requestId, {
            bookingId,
            reservationId: booking.reservationId,
            propertyId: booking.propertyId,
            paymentAttempts,
            threshold,
        });
        if (paymentAttempts < threshold) {
            this.logger.logInfo('Cancellation request threshold not reached; skipping', 'SchedulerService', 'requestAdminCancellationIfThresholdReached', requestId, { bookingId, paymentAttempts, threshold });
            return;
        }
        await this.requestAdminCancellationForBooking(bookingId, requestId);
    }
    mergeRecipients(adminEmails, supportEmails) {
        return Array.from(new Set([...(adminEmails ?? []), ...(supportEmails ?? [])]
            .map((e) => String(e || '').trim())
            .filter(Boolean)));
    }
    async getPropertyNotificationSetting(propertyId) {
        const propertySetting = await this.prisma.propertyNotificationSetting.findUnique({
            where: { propertyId },
        });
        if (propertySetting)
            return propertySetting;
        return this.prisma.propertyNotificationSetting.findFirst({
            where: { propertyId: null },
        });
    }
};
exports.SchedulerService = SchedulerService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "monitorFlexibleBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_30_MINUTES),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "processNonRefundableBookings", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "processPaymentRetries", null);
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_12_HOURS),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SchedulerService.prototype, "sendPaymentReminders", null);
exports.SchedulerService = SchedulerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        payment_service_1.PaymentService,
        email_service_1.EmailService,
        risk_assessment_service_1.RiskAssessmentService,
        occupancy_service_1.OccupancyService,
        cloudbed_api_service_1.CloudbedApiService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map