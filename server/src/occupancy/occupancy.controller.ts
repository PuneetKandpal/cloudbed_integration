import { Controller, Get, Query } from '@nestjs/common';
import { LoggerService } from '../common/logger/logger.service';
import { OccupancyService } from './occupancy.service';

@Controller('occupancy')
export class OccupancyController {
  private readonly logger = new LoggerService('OccupancyController');

  constructor(private readonly occupancyService: OccupancyService) {}

  @Get('daily')
  async getDailyOccupancy(
    @Query('propertyId') propertyId?: string,
    @Query('date') date?: string,
  ) {
    const requestId = this.logger.generateRequestId();

    this.logger.logInfo(
      'Received daily occupancy request',
      'OccupancyController',
      'getDailyOccupancy',
      requestId,
      { propertyId, date },
    );

    const response = await this.occupancyService.getDailyOccupancy({
      propertyId,
      date,
      requestId,
    });

    return {
      status: 'success',
      requestId,
      data: response,
    };
  }
}
