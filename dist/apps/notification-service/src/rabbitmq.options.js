"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRabbitMQOptions = void 0;
const getRabbitMQOptions = () => ({
    uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
    exchanges: [
        {
            name: 'booking',
            type: 'topic',
        },
    ],
    connectionInitOptions: { wait: true },
});
exports.getRabbitMQOptions = getRabbitMQOptions;
//# sourceMappingURL=rabbitmq.options.js.map