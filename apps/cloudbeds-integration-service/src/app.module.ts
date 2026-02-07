import { Module } from '@nestjs/common';
import { CommonModule } from '@hostelworld/common';
import { CloudbedsModule } from './cloudbeds/cloudbeds.module';
import { LoggerModule } from '../../../libs/logger/src/logger.module'; // 👈 ADD THIS

@Module({
  
  imports: [LoggerModule,CommonModule, CloudbedsModule],
})
export class AppModule {}
