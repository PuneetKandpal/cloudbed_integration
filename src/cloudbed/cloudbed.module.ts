import { Module } from '@nestjs/common';
import { CloudbedApiService } from './cloudbed-api.service';

@Module({
  providers: [CloudbedApiService],
  exports: [CloudbedApiService],
})
export class CloudbedModule {}
