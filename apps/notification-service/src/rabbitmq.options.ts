import { RabbitMQConfig } from '@golevelup/nestjs-rabbitmq';

export const getRabbitMQOptions = (): RabbitMQConfig => ({
  uri: process.env.RABBITMQ_URI || 'amqp://localhost:5672',
  exchanges: [
    {
      name: 'booking',
      type: 'topic',
    },
  ],
  connectionInitOptions: { wait: true },
});
