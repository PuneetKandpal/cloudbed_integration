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
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let PaymentService = class PaymentService {
    prisma;
    config;
    logger = new logger_service_1.LoggerService('PaymentService');
    paymentGatewayConfig;
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
        this.paymentGatewayConfig = {
            loginUrl: this.config.get('PAYMENT_GATEWAY_LOGIN_URL') || '',
            chargeUrl: this.config.get('PAYMENT_GATEWAY_CHARGE_URL') || '',
            username: this.config.get('PAYMENT_GATEWAY_USERNAME') || '',
            password: this.config.get('PAYMENT_GATEWAY_PASSWORD') || '',
        };
    }
    async enqueueChargeTask(params) {
        const task = await this.prisma.chargeTask.create({
            data: {
                paymentId: params.paymentId,
                bookingId: params.bookingId,
                reservationId: params.reservationId,
                propertyId: params.propertyId,
                amount: params.amount,
                currency: params.currency,
                requestId: params.requestId,
                status: client_1.ChargeTaskStatus.PENDING,
                scheduledFor: new Date(),
            },
            select: { id: true },
        });
        this.logger.logInfo('Enqueued payment charge task to ChargeTask table for worker', 'PaymentService', 'enqueueChargeTask', params.requestId, {
            taskId: task.id,
            paymentId: params.paymentId,
            bookingId: params.bookingId,
            reservationId: params.reservationId,
            propertyId: params.propertyId,
            amount: params.amount,
            currency: params.currency,
        });
        return { taskId: task.id };
    }
    async authorizePayment(bookingId, amount, requestId) {
        this.logger.logInfo('Authorizing payment for booking', 'PaymentService', 'authorizePayment', requestId, { bookingId, amount });
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                return { success: false, error: 'Booking not found' };
            }
            const existingAttempts = await this.prisma.payment.count({
                where: { bookingId },
            });
            const attemptNumber = existingAttempts + 1;
            const payment = await this.prisma.payment.create({
                data: {
                    bookingId,
                    amount,
                    currency: booking.currency,
                    status: client_1.PaymentStatus.PENDING,
                    attemptNumber,
                },
            });
            await this.enqueueChargeTask({
                paymentId: payment.id,
                bookingId: booking.id,
                reservationId: booking.reservationId,
                propertyId: booking.propertyId,
                amount,
                currency: booking.currency,
                requestId,
            });
            this.logger.logInfo('Payment charge task enqueued for worker', 'PaymentService', 'authorizePayment', requestId, { bookingId, paymentId: payment.id });
            return {
                success: true,
            };
        }
        catch (error) {
            this.logger.logError('Failed to authorize payment', 'PaymentService', 'authorizePayment', error, requestId, { bookingId });
            return { success: false, error: String(error) };
        }
    }
    async processPayment(bookingId, requestId) {
        this.logger.logInfo('Processing payment for booking', 'PaymentService', 'processPayment', requestId, { bookingId });
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                throw new Error('Booking not found');
            }
            const remainingBalance = booking.remainingBalance.toNumber();
            if (remainingBalance <= 0) {
                this.logger.logInfo('No outstanding balance, skipping payment', 'PaymentService', 'processPayment', requestId, { bookingId });
                return;
            }
            const existingAttempts = await this.prisma.payment.count({
                where: { bookingId },
            });
            const attemptNumber = existingAttempts + 1;
            const payment = await this.prisma.payment.create({
                data: {
                    bookingId,
                    amount: booking.remainingBalance,
                    currency: booking.currency,
                    status: client_1.PaymentStatus.PENDING,
                    attemptNumber,
                },
            });
            await this.enqueueChargeTask({
                paymentId: payment.id,
                bookingId: booking.id,
                reservationId: booking.reservationId,
                propertyId: booking.propertyId,
                amount: remainingBalance,
                currency: booking.currency,
                requestId,
            });
            this.logger.logInfo('Payment charge task enqueued for worker', 'PaymentService', 'processPayment', requestId, { bookingId, paymentId: payment.id });
        }
        catch (error) {
            this.logger.logError('Failed to process payment', 'PaymentService', 'processPayment', error, requestId, { bookingId });
            throw error;
        }
    }
    async handlePaymentFailureTx(tx, paymentId, bookingId, attemptNumber, errorMessage, requestId) {
        this.logger.logWarn('Payment failed, handling failure', 'PaymentService', 'handlePaymentFailureTx', requestId, { paymentId, bookingId, attemptNumber, errorMessage });
        await tx.payment.update({
            where: { id: paymentId },
            data: {
                status: client_1.PaymentStatus.FAILED,
                errorMessage,
                nextRetryAt: null,
            },
        });
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map