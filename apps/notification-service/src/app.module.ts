import { Module } from '@nestjs/common';
import { MongoModule } from '@hostelworld/database';
import { CommonModule } from '@hostelworld/common';
import { NotificationsModule } from './notifications.module';

@Module({
  imports: [
    CommonModule,
    MongoModule.forRoot({
      uri: process.env.MONGO_URI ?? 'mongodb://localhost:27017',
      dbName: process.env.NOTIFICATION_DB_NAME ?? 'notification_db',
    }),
    NotificationsModule,
  ],
})
export class AppModule {}
