"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingPolicyModule = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const payment_policy_service_1 = require("./services/payment-policy.service");
const booking_stored_consumer_1 = require("./consumers/booking-stored.consumer");
const payment_policy_publisher_1 = require("./publishers/payment-policy.publisher");
let BookingPolicyModule = class BookingPolicyModule {
};
exports.BookingPolicyModule = BookingPolicyModule;
exports.BookingPolicyModule = BookingPolicyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            microservices_1.ClientsModule.register([
                {
                    name: 'RABBITMQ_SERVICE',
                    transport: microservices_1.Transport.RMQ,
                    options: {
                        urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                        queue: 'booking_policy_queue',
                    },
                },
            ]),
        ],
        providers: [
            payment_policy_service_1.BookingPolicyService,
            booking_stored_consumer_1.BookingStoredConsumer,
            payment_policy_publisher_1.PaymentPolicyPublisher,
        ],
    })
], BookingPolicyModule);
//# sourceMappingURL=booking-policy.module.js.map