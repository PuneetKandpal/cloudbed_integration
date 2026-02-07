import { DynamicModule, Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoService } from './mongo.service';

export interface MongoModuleOptions {
  uri: string;
  dbName?: string;
}

/**
 * Reusable Mongo connection module using @nestjs/mongoose.
 * Import in app modules that need MongoDB (NOT audit-service).
 */
@Global()
@Module({})
export class MongoModule {
  static forRoot(options: MongoModuleOptions): DynamicModule {
    return {
      module: MongoModule,
      imports: [
        MongooseModule.forRoot(options.uri, {
          dbName: options.dbName,
        }),
      ],
      providers: [MongoService],
      exports: [MongoService, MongooseModule],
    };
  }
}
