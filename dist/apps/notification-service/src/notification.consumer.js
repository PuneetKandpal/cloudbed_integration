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
exports.NotificationConsumer = void 0;
const common_1 = require("@nestjs/common");
const nestjs_rabbitmq_1 = require("@golevelup/nestjs-rabbitmq");
const email_service_1 = require("./email.service");
const logger_service_1 = require("./logger.service");
let NotificationConsumer = class NotificationConsumer {
    constructor(emailService, logger) {
        this.emailService = emailService;
        this.logger = logger;
        this.logger.setContext('NotificationConsumer');
    }
    async bookingConfirmed(data) {
        this.logger.log(`Processing booking confirmed notification for: ${data.bookingId}`);
        await this.emailService.send(data.guestEmail, 'Booking Confirmed', `Your booking ${data.bookingId} is confirmed.`);
    }
    async paymentFailed(data) {
        this.logger.log(`Processing payment failed notification for: ${data.bookingId}`);
        await this.emailService.send(data.guestEmail, 'Payment Failed', `Payment failed for booking ${data.bookingId}. Please update payment.`);
    }
    async bookingCancelled(data) {
        this.logger.log(`Processing booking cancelled notification for: ${data.bookingId}`);
        await this.emailService.send(data.guestEmail, 'Booking Cancelled', `Your booking ${data.bookingId} was cancelled.`);
    }
};
exports.NotificationConsumer = NotificationConsumer;
__decorate([
    (0, nestjs_rabbitmq_1.RabbitSubscribe)({
        exchange: 'booking',
        routingKey: 'BOOKING_CONFIRMED',
        queue: 'email-booking-confirmed',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationConsumer.prototype, "bookingConfirmed", null);
__decorate([
    (0, nestjs_rabbitmq_1.RabbitSubscribe)({
        exchange: 'booking',
        routingKey: 'PAYMENT_FAILED',
        queue: 'email-payment-failed',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationConsumer.prototype, "paymentFailed", null);
__decorate([
    (0, nestjs_rabbitmq_1.RabbitSubscribe)({
        exchange: 'booking',
        routingKey: 'BOOKING_CANCELLED',
        queue: 'email-booking-cancelled',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationConsumer.prototype, "bookingCancelled", null);
exports.NotificationConsumer = NotificationConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [email_service_1.EmailService,
        logger_service_1.LoggerService])
], NotificationConsumer);
//# sourceMappingURL=notification.consumer.js.map