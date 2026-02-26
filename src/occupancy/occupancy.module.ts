import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OccupancyController } from './occupancy.controller';
import { OccupancyService } from './occupancy.service';
import { CloudbedModule } from '../cloudbed/cloudbed.module';

@Module({
  imports: [ConfigModule, CloudbedModule],
  controllers: [OccupancyController],
  providers: [OccupancyService],
  exports: [OccupancyService],
})
export class OccupancyModule {}
