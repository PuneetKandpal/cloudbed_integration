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
var BookingPublisher_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingPublisher = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const common_2 = require("../../../libs/common/src");
const shared_events_1 = require("../../../libs/shared-events/src");
const logger_service_1 = require("./logger.service");
const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';
let BookingPublisher = BookingPublisher_1 = class BookingPublisher {
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext(BookingPublisher_1.name);
        this.client = microservices_1.ClientProxyFactory.create({
            transport: microservices_1.Transport.RMQ,
            options: {
                urls: [RABBITMQ_URI],
                queue: 'booking_events',
                queueOptions: { durable: true },
            },
        });
    }
    async publishBookingCreated(payload, correlationId) {
        const event = (0, shared_events_1.createBaseEvent)(common_2.EVENT_NAMES.BOOKING_CREATED, payload, 'booking-service', correlationId);
        this.client.emit(common_2.EVENT_NAMES.BOOKING_CREATED, event).subscribe();
        this.logger.log(`Published BOOKING_CREATED event for correlationId: ${correlationId}`);
    }
    async publishBookingUpdated(payload, correlationId) {
        const event = (0, shared_events_1.createBaseEvent)(common_2.EVENT_NAMES.BOOKING_UPDATED, payload, 'booking-service', correlationId);
        this.client.emit(common_2.EVENT_NAMES.BOOKING_UPDATED, event).subscribe();
        this.logger.log(`Published BOOKING_UPDATED event for correlationId: ${correlationId}`);
    }
    async publishBookingCancelled(payload, correlationId) {
        const event = (0, shared_events_1.createBaseEvent)(common_2.EVENT_NAMES.BOOKING_CANCELLED, payload, 'booking-service', correlationId);
        this.client.emit(common_2.EVENT_NAMES.BOOKING_CANCELLED, event).subscribe();
        this.logger.log(`Published BOOKING_CANCELLED event for correlationId: ${correlationId}`);
    }
};
exports.BookingPublisher = BookingPublisher;
exports.BookingPublisher = BookingPublisher = BookingPublisher_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [logger_service_1.LoggerService])
], BookingPublisher);
//# sourceMappingURL=payment.publisher.js.map