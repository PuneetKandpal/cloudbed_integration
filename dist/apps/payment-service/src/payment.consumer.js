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
exports.PaymentConsumer = void 0;
const common_1 = require("@nestjs/common");
const nestjs_rabbitmq_1 = require("@golevelup/nestjs-rabbitmq");
const payment_service_1 = require("./payment.service");
const microservices_1 = require("@nestjs/microservices");
const logger_service_1 = require("./logger.service");
let PaymentConsumer = class PaymentConsumer {
    constructor(payment, logger) {
        this.payment = payment;
        this.logger = logger;
        this.logger.setContext('PaymentConsumer');
        this.publisher = microservices_1.ClientProxyFactory.create({
            transport: microservices_1.Transport.RMQ,
            options: {
                urls: [process.env.RABBITMQ_URI || 'amqp://localhost:5672'],
                queue: 'payment_events',
                queueOptions: { durable: true },
            },
        });
    }
    handlePayment(payload) {
        try {
            this.logger.log(`Processing payment for booking: ${payload.bookingId}`);
            const result = this.payment.charge(payload);
            this.publisher
                .emit('PAYMENT_SUCCESS', {
                bookingId: payload.bookingId,
                transactionId: result.transactionId,
            })
                .subscribe();
            this.logger.log(`Payment successful for booking: ${payload.bookingId}, transaction: ${result.transactionId}`);
        }
        catch (e) {
            this.logger.error(`Payment failed for booking: ${payload.bookingId}`, e.message);
            this.publisher
                .emit('PAYMENT_FAILED', {
                bookingId: payload.bookingId,
                reason: e.message,
            })
                .subscribe();
        }
    }
};
exports.PaymentConsumer = PaymentConsumer;
__decorate([
    (0, nestjs_rabbitmq_1.RabbitSubscribe)({
        exchange: 'booking',
        routingKey: 'PAYMENT_AUTH_REQUIRED',
        queue: 'payment-auth',
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PaymentConsumer.prototype, "handlePayment", null);
exports.PaymentConsumer = PaymentConsumer = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [payment_service_1.MockPaymentService,
        logger_service_1.LoggerService])
], PaymentConsumer);
//# sourceMappingURL=payment.consumer.js.map