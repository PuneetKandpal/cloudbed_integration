import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { getRabbitMQOptions } from './rabbitmq.options';

async function bootstrap() {
  // Create HTTP app (optional but recommended)
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  // Connect RabbitMQ microservice
  app.connectMicroservice<MicroserviceOptions>(
    getRabbitMQOptions() as any,
  );

  // Start RabbitMQ consumers
  await app.startAllMicroservices();

  // Start HTTP server (for health / future admin APIs)
  const port = Number(process.env.NOTIFICATION_SERVICE_PORT) || 3011;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Notification Service running on port ${port}`);
}

bootstrap();
