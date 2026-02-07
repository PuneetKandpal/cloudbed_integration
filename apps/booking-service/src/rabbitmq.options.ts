import { RmqOptions, Transport } from '@nestjs/microservices';

const RABBITMQ_URI = process.env.RABBITMQ_URI ?? 'amqp://localhost:5672';

export function getRabbitMQOptions(queuePrefix: string): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [RABBITMQ_URI],
      queue: `${queuePrefix}_queue`,
      queueOptions: { durable: true },
      noAck: false,
    },
  };
}
