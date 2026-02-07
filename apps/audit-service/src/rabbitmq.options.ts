import { RmqOptions, Transport } from '@nestjs/microservices';

export function getRabbitMQOptions(): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
      queue: 'hostelworld-events', // 🔑 SHARED QUEUE
      queueOptions: {
        durable: true,
      },
    },
  };
}
