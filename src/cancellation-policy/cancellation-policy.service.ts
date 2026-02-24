import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class CancellationPolicyService {
  private readonly logger = new LoggerService('CancellationPolicyService');

  constructor(private readonly prisma: PrismaService) {}

  async getCancellationPolicy(propertyId?: string, requestId?: string) {
    this.logger.logInfo(
      'Fetching cancellation policy',
      'CancellationPolicyService',
      'getCancellationPolicy',
      requestId,
      { propertyId },
    );

    if (propertyId) {
      const policy = await this.prisma.cancellationPolicy.findUnique({
        where: { propertyId },
      });
      
      if (policy) {
        return policy;
      }
    }

    const globalPolicy = await this.prisma.cancellationPolicy.findFirst({
      where: { propertyId: null },
    });

    if (globalPolicy) {
      return globalPolicy;
    }

    const defaultPolicy = await this.prisma.cancellationPolicy.create({
      data: {
        propertyId: null,
        daysBeforeCheckin: 2,
      },
    });

    this.logger.logInfo(
      'Created default global cancellation policy',
      'CancellationPolicyService',
      'getCancellationPolicy',
      requestId,
      { policyId: defaultPolicy.id, daysBeforeCheckin: defaultPolicy.daysBeforeCheckin },
    );

    return defaultPolicy;
  }

  async updateCancellationPolicy(
    propertyId: string | null,
    daysBeforeCheckin: number,
    requestId?: string,
  ) {
    this.logger.logInfo(
      'Updating cancellation policy',
      'CancellationPolicyService',
      'updateCancellationPolicy',
      requestId,
      { propertyId, daysBeforeCheckin },
    );

    const existingPolicy = propertyId
      ? await this.prisma.cancellationPolicy.findUnique({
          where: { propertyId },
        })
      : await this.prisma.cancellationPolicy.findFirst({
          where: { propertyId: null },
        });

    if (existingPolicy) {
      const updated = await this.prisma.cancellationPolicy.update({
        where: { id: existingPolicy.id },
        data: { daysBeforeCheckin },
      });

      this.logger.logInfo(
        'Updated existing cancellation policy',
        'CancellationPolicyService',
        'updateCancellationPolicy',
        requestId,
        { policyId: updated.id, daysBeforeCheckin: updated.daysBeforeCheckin },
      );

      return updated;
    }

    const created = await this.prisma.cancellationPolicy.create({
      data: {
        propertyId,
        daysBeforeCheckin,
      },
    });

    this.logger.logInfo(
      'Created new cancellation policy',
      'CancellationPolicyService',
      'updateCancellationPolicy',
      requestId,
      { policyId: created.id, daysBeforeCheckin: created.daysBeforeCheckin },
    );

    return created;
  }

  async deleteCancellationPolicy(propertyId: string | null, requestId?: string) {
    this.logger.logInfo(
      'Deleting cancellation policy',
      'CancellationPolicyService',
      'deleteCancellationPolicy',
      requestId,
      { propertyId },
    );

    const policy = propertyId
      ? await this.prisma.cancellationPolicy.findUnique({
          where: { propertyId },
        })
      : await this.prisma.cancellationPolicy.findFirst({
          where: { propertyId: null },
        });

    if (!policy) {
      throw new Error('Cancellation policy not found');
    }

    await this.prisma.cancellationPolicy.delete({
      where: { id: policy.id },
    });

    this.logger.logInfo(
      'Deleted cancellation policy',
      'CancellationPolicyService',
      'deleteCancellationPolicy',
      requestId,
      { policyId: policy.id },
    );

    return { success: true, deletedPolicyId: policy.id };
  }
}
