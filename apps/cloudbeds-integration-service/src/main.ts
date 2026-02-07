import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  const port = process.env.CLOUDBEDS_SERVICE_PORT ?? 3002;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Cloudbeds Integration Service running on port ${port}`);
}

bootstrap();
