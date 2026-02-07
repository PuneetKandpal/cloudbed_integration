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
var ProducerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProducerService = void 0;
const common_1 = require("@nestjs/common");
const microservices_1 = require("@nestjs/microservices");
const common_2 = require("../../../libs/common/src");
const shared_events_1 = require("../../../libs/shared-events/src");
const common_3 = require("../../../libs/common/src");
const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';
let ProducerService = ProducerService_1 = class ProducerService {
    constructor(logger) {
        this.logger = logger;
        this.logger.setContext(ProducerService_1.name);
        this.client = microservices_1.ClientProxyFactory.create({
            transport: microservices_1.Transport.RMQ,
            options: {
                urls: [RABBITMQ_URI],
                queue: 'notification_events',
                queueOptions: { durable: true },
            },
        });
    }
    async publishNotificationSent(payload, correlationId) {
        const event = (0, shared_events_1.createBaseEvent)(common_2.EVENT_NAMES.NOTIFICATION_SENT, payload, 'notification-service', correlationId);
        this.client.emit(common_2.EVENT_NAMES.NOTIFICATION_SENT, event).subscribe();
    }
    async publishNotificationFailed(payload, correlationId) {
        const event = (0, shared_events_1.createBaseEvent)(common_2.EVENT_NAMES.NOTIFICATION_FAILED, payload, 'notification-service', correlationId);
        this.client.emit(common_2.EVENT_NAMES.NOTIFICATION_FAILED, event).subscribe();
    }
};
exports.ProducerService = ProducerService;
exports.ProducerService = ProducerService = ProducerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [common_3.AppLogger])
], ProducerService);
//# sourceMappingURL=producer.service.js.map