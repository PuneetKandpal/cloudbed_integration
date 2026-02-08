import { Module } from '@nestjs/common';
import { CommonModule } from '@hostelworld/common';
import { CloudbedsModule } from './cloudbeds/cloudbeds.module';

@Module({
  imports: [CommonModule, CloudbedsModule],
})
export class AppModule {}
