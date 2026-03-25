import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';

@Injectable()
export class PropertyTimeZoneService {
  private readonly logger = new LoggerService('PropertyTimeZoneService');

  constructor(private readonly prisma: PrismaService) {}

  private assertValidTimeZone(timeZone: string) {
    const tz = String(timeZone ?? '').trim();
    if (!tz) {
      throw new BadRequestException('timeZone is required');
    }

    try {
      new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    } catch {
      throw new BadRequestException(`Invalid IANA timezone: ${tz}`);
    }
  }

  async listAll(requestId?: string) {
    this.logger.logInfo(
      'Listing property timezones',
      'PropertyTimeZoneService',
      'listAll',
      requestId,
      {},
    );

    return this.prisma.propertyTimeZone.findMany({
      orderBy: { propertyId: 'asc' },
    });
  }

  async getByPropertyId(propertyId: string, requestId?: string) {
    const normalized = String(propertyId ?? '').trim();
    if (!normalized) {
      throw new BadRequestException('propertyId is required');
    }

    this.logger.logInfo(
      'Fetching property timezone',
      'PropertyTimeZoneService',
      'getByPropertyId',
      requestId,
      { propertyId: normalized },
    );

    return this.prisma.propertyTimeZone.findUnique({
      where: { propertyId: normalized },
    });
  }

  async upsert(propertyId: string, timeZone: string, requestId?: string) {
    const normalizedPropertyId = String(propertyId ?? '').trim();
    if (!normalizedPropertyId) {
      throw new BadRequestException('propertyId is required');
    }

    this.assertValidTimeZone(timeZone);

    this.logger.logInfo(
      'Upserting property timezone',
      'PropertyTimeZoneService',
      'upsert',
      requestId,
      { propertyId: normalizedPropertyId, timeZone },
    );

    return this.prisma.propertyTimeZone.upsert({
      where: { propertyId: normalizedPropertyId },
      update: { timeZone },
      create: { propertyId: normalizedPropertyId, timeZone },
    });
  }

  async delete(propertyId: string, requestId?: string) {
    const normalized = String(propertyId ?? '').trim();
    if (!normalized) {
      throw new BadRequestException('propertyId is required');
    }

    this.logger.logInfo(
      'Deleting property timezone',
      'PropertyTimeZoneService',
      'delete',
      requestId,
      { propertyId: normalized },
    );

    const existing = await this.prisma.propertyTimeZone.findUnique({
      where: { propertyId: normalized },
    });

    if (!existing) {
      throw new NotFoundException('Property timezone not found');
    }

    await this.prisma.propertyTimeZone.delete({
      where: { propertyId: normalized },
    });

    return { success: true, deletedPropertyId: normalized };
  }
}
