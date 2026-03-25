import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PropertyTimeZoneController } from './property-timezone.controller';
import { PropertyTimeZoneService } from './property-timezone.service';

@Module({
  imports: [PrismaModule],
  controllers: [PropertyTimeZoneController],
  providers: [PropertyTimeZoneService],
  exports: [PropertyTimeZoneService],
})
export class PropertyTimeZoneModule {}
