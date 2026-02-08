import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { CloudbedsWebhookController } from '../cloudbeds.webhook.controller';
import { CloudbedsService } from '../cloudbeds.service';
import { CloudbedsParserService } from '../cloudbeds.parser.service';
import { CloudbedsSourceDetectorService } from '../cloudbeds.source-detector.service';
import { CloudbedsPublisher } from '../cloudbeds.publisher';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RABBITMQ_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
          queue: 'hostelworld-events',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [CloudbedsWebhookController],
  providers: [
    CloudbedsService,
    CloudbedsParserService,
    CloudbedsSourceDetectorService,
    CloudbedsPublisher,
  ],
})
export class CloudbedsModule {}
