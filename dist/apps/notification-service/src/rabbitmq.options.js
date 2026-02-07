"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitMQOptions = getRabbitMQOptions;
const microservices_1 = require("@nestjs/microservices");
const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';
function getRabbitMQOptions(queuePrefix) {
    return {
        transport: microservices_1.Transport.RMQ,
        options: {
            urls: [RABBITMQ_URI],
            queue: `${queuePrefix}_queue`,
            queueOptions: { durable: true },
            noAck: false,
        },
    };
}
//# sourceMappingURL=rabbitmq.options.js.map