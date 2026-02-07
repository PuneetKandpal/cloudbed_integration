"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitMQOptions = getRabbitMQOptions;
const microservices_1 = require("@nestjs/microservices");
function getRabbitMQOptions() {
    return {
        transport: microservices_1.Transport.RMQ,
        options: {
            urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
            queue: 'hostelworld-events',
            queueOptions: {
                durable: true,
            },
        },
    };
}
//# sourceMappingURL=rabbitmq.options.js.map