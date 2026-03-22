import { Controller, Get, Put, Delete, Body, Query, Param } from '@nestjs/common';
import { CancellationPolicyService } from './cancellation-policy.service';

@Controller('cancellation-policy')
export class CancellationPolicyController {
  constructor(
    private readonly cancellationPolicyService: CancellationPolicyService,
  ) {}

  @Get()
  async getCancellationPolicy(
    @Query('propertyId') propertyId?: string,
    @Query('requestId') requestId?: string,
  ) {
    return this.cancellationPolicyService.getCancellationPolicy(
      propertyId,
      requestId,
    );
  }

  @Put()
  async updateCancellationPolicy(
    @Body()
    body: {
      propertyId?: string | null;
      daysBeforeCheckin: number;
      requestId?: string;
    },
  ) {
    return this.cancellationPolicyService.updateCancellationPolicy(
      body.propertyId ?? null,
      body.daysBeforeCheckin,
      body.requestId,
    );
  }

  @Delete(':propertyId')
  async deleteCancellationPolicyByProperty(
    @Param('propertyId') propertyId: string,
    @Query('requestId') requestId?: string,
  ) {
    return this.cancellationPolicyService.deleteCancellationPolicy(
      propertyId,
      requestId,
    );
  }

  @Delete()
  async deleteGlobalCancellationPolicy(
    @Query('requestId') requestId?: string,
  ) {
    return this.cancellationPolicyService.deleteCancellationPolicy(
      null,
      requestId,
    );
  }
}
