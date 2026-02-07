import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Wrapper for Mongo connection; use for health checks or connection access.
 */
@Injectable()
export class MongoService implements OnModuleDestroy {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  getConnection(): Connection {
    return this.connection;
  }

  async onModuleDestroy() {
    await this.connection.close();
  }
}
