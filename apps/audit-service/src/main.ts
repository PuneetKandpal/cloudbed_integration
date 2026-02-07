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

  app.connectMicroservice<MicroserviceOptions>(
    getRabbitMQOptions(),
  );
  

  await app.startAllMicroservices();

  const port = process.env.AUDIT_SERVICE_PORT ?? 3005;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Audit Service running on port ${port}`);
}

bootstrap();
