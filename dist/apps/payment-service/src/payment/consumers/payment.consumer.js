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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentConsumer = void 0;
const common_1 = require("@nestjs/common");
const nestjs_rabbitmq_1 = require("@golevelup/nestjs-rabbitmq");
const mock_payment_service_1 = require("../services/mock-payment.service");
const common_2 = require("../../../../../libs/common/src");
let PaymentConsumer = class PaymentConsumer {
    constructor(payment, publisher) {
        this.payment = payment;
        this.publisher = publisher;
    }
    handlePayment(payload) {
        try {
            const result = this.payment.charge(payload);
            this.publisher.publish('PAYMENT_SUCCESS', {
                bookingId: payload.bookingId,
                transactionId: result.transactionId,
            });
        }
        catch (e) {
            this.publisher.publish('PAYMENT_FAILED', {
                bookingId: payload.bookingId,
                reason: e.message,
            });
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
    __metadata("design:paramtypes", [typeof (_a = typeof mock_payment_service_1.MockPaymentService !== "undefined" && mock_payment_service_1.MockPaymentService) === "function" ? _a : Object, typeof (_b = typeof common_2.EventPublisher !== "undefined" && common_2.EventPublisher) === "function" ? _b : Object])
], PaymentConsumer);
//# sourceMappingURL=payment.consumer.js.map