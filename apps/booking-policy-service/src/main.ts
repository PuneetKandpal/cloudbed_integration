import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions } from '@nestjs/microservices';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { getRabbitMQOptions } from './rabbitmq.options';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );
  app.connectMicroservice<MicroserviceOptions>(getRabbitMQOptions('payment-policy-service'));
  await app.startAllMicroservices();
  const port = 3008;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Booking Policy running on port 3008`);

}

bootstrap();
console.log(`🚀 Booking service running on port 3007`);
