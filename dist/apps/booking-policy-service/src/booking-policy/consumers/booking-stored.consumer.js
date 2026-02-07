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
exports.BookingStoredConsumer = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const payment_policy_service_1 = require("../../../../../apps/booking-policy-service/src/booking-policy/services/payment-policy.service");
const payment_policy_publisher_1 = require("../publishers/payment-policy.publisher");
let BookingStoredConsumer = class BookingStoredConsumer {
    constructor(policyService, publisher) {
        this.policyService = policyService;
        this.publisher = publisher;
    }
    async handle(event) {
        const decision = this.policyService.evaluate(event.booking);
        if (decision === 'PAY_NOW') {
            await this.publisher.requestPayment(event.booking);
        }
    }
};
exports.BookingStoredConsumer = BookingStoredConsumer;
__decorate([
    (0, microservices_1.EventPattern)('BOOKING_STORED'),
    __param(0, (0, microservices_1.Payload)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BookingStoredConsumer.prototype, "handle", null);
exports.BookingStoredConsumer = BookingStoredConsumer = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [payment_policy_service_1.BookingPolicyService,
        payment_policy_publisher_1.PaymentPolicyPublisher])
], BookingStoredConsumer);
//# sourceMappingURL=booking-stored.consumer.js.map