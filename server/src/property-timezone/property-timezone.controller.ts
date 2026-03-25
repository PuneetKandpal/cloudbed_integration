import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { PropertyTimeZoneService } from './property-timezone.service';

@Controller('property-timezone')
export class PropertyTimeZoneController {
  constructor(private readonly propertyTimeZoneService: PropertyTimeZoneService) {}

  @Get()
  async get(
    @Query('propertyId') propertyId?: string,
    @Query('requestId') requestId?: string,
  ) {
    if (!propertyId) {
      return this.propertyTimeZoneService.listAll(requestId);
    }

    return this.propertyTimeZoneService.getByPropertyId(propertyId, requestId);
  }

  @Put()
  async upsert(
    @Body()
    body: {
      propertyId: string;
      timeZone: string;
      requestId?: string;
    },
  ) {
    return this.propertyTimeZoneService.upsert(
      body.propertyId,
      body.timeZone,
      body.requestId,
    );
  }

  @Delete(':propertyId')
  async delete(
    @Param('propertyId') propertyId: string,
    @Query('requestId') requestId?: string,
  ) {
    return this.propertyTimeZoneService.delete(propertyId, requestId);
  }
}
