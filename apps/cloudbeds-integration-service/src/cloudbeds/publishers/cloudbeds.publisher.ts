import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';

@Injectable()
export class CloudbedsPublisher {
  constructor(
    @Inject('RABBITMQ_CLIENT')
    private readonly client: ClientProxy,
  ) {}

  publishBookingReceived(event: any) {
    return this.client.emit('BOOKING_RECEIVED', event);
  }
}
