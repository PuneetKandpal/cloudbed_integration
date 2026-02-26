import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { format, isValid, parseISO } from 'date-fns';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
import { LoggerService } from '../common/logger/logger.service';

type GetDailyOccupancyParams = {
  propertyId?: string;
  date?: string;
  requestId: string;
};

type RoomSummary = {
  roomID: string;
  roomName: string;
  roomTypeID: string;
  roomTypeName: string;
  isPrivate: boolean;
  isVirtual: boolean;
  maxGuests: number;
  roomBlocked?: boolean;
};

type RoomBlockSummary = {
  roomBlockID: string;
  roomBlockReason?: string;
  startDate?: string;
  endDate?: string;
  roomIDs: string[];
  roomTypeIDs: string[];
};

@Injectable()
export class OccupancyService {
  private readonly logger = new LoggerService('OccupancyService');

  constructor(
    private readonly cloudbedApi: CloudbedApiService,
    private readonly configService: ConfigService,
  ) {}

  async getDailyOccupancy(params: GetDailyOccupancyParams) {
    const { propertyId, date, requestId } = params;

    const resolvedPropertyId =
      propertyId || this.configService.get<string>('CLOUDBED_PROPERTY_ID');

    if (!resolvedPropertyId) {
      throw new BadRequestException(
        'propertyId is required (env CLOUDBED_PROPERTY_ID or query parameter)',
      );
    }

    const targetDate = this.resolveDate(date);
    const dateString = format(targetDate, 'yyyy-MM-dd');

    this.logger.logInfo(
      'Fetching occupancy snapshot',
      'OccupancyService',
      'getDailyOccupancy',
      requestId,
      { propertyId: resolvedPropertyId, date: dateString },
    );

    const [allRoomsPayload, unassignedRoomsPayload, roomBlocksPayload] =
      await Promise.all([
        this.cloudbedApi.getRooms({ propertyIDs: resolvedPropertyId }, requestId),
        this.cloudbedApi.getRooms(
          {
            propertyIDs: resolvedPropertyId,
            startDate: dateString,
            endDate: dateString,
          },
          requestId,
        ),
        this.cloudbedApi.getRoomBlocks(
          {
            propertyID: resolvedPropertyId,
            startDate: dateString,
            endDate: dateString,
          },
          requestId,
        ),
      ]);

    const allRooms = this.extractRooms(allRoomsPayload);
    const unassignedRooms = this.extractRooms(unassignedRoomsPayload);
    const roomBlocks = this.normalizeRoomBlocks(roomBlocksPayload);

    const physicalRooms = allRooms.filter((room) => !room.isVirtual);
    const unassignedPhysicalRooms = unassignedRooms.filter(
      (room) => !room.isVirtual,
    );

    const totalRooms = physicalRooms.length;
    const unassignedRoomsCount = unassignedPhysicalRooms.length;
    const blockedRoomsCount = roomBlocks.reduce(
      (acc, block) => acc + block.roomIDs.length,
      0,
    );
    const occupiedRooms = Math.max(totalRooms - unassignedRoomsCount, 0);
    const occupancyRate =
      totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

    const response = {
      propertyId: resolvedPropertyId,
      date: dateString,
      totals: {
        totalRooms,
        occupiedRooms,
        unassignedRooms: unassignedRoomsCount,
        blockedRooms: blockedRoomsCount,
        occupancyRate: Number(occupancyRate.toFixed(2)),
      },
      details: {
        unassignedRooms: this.formatRooms(unassignedRooms),
        roomBlocks,
      },
    };

    this.logger.logInfo(
      'Occupancy snapshot ready',
      'OccupancyService',
      'getDailyOccupancy',
      requestId,
      {},
      response.totals,
    );

    return response;
  }

  private resolveDate(date?: string): Date {
    if (!date) {
      return new Date();
    }

    const parsed = parseISO(date);
    if (!isValid(parsed)) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD');
    }
    return parsed;
  }

  private extractRooms(payload: any[]): RoomSummary[] {
    if (!Array.isArray(payload)) {
      return [];
    }

    return payload.flatMap((property) => {
      if (!Array.isArray(property?.rooms)) {
        return [];
      }

      return property.rooms.map((room: any) => this.formatRoom(room));
    });
  }

  private formatRooms(rooms: RoomSummary[]): RoomSummary[] {
    return rooms.map((room) => this.formatRoom(room));
  }

  private formatRoom(room: any): RoomSummary {
    return {
      roomID: String(room?.roomID ?? ''),
      roomName: String(room?.roomName ?? ''),
      roomTypeID: String(room?.roomTypeID ?? ''),
      roomTypeName: String(room?.roomTypeName ?? ''),
      isPrivate: Boolean(room?.isPrivate),
      isVirtual: Boolean(room?.isVirtual),
      maxGuests: Number(room?.maxGuests ?? 0),
      roomBlocked: Boolean(room?.roomBlocked),
    };
  }

  private normalizeRoomBlocks(blocks: any[]): RoomBlockSummary[] {
    if (!Array.isArray(blocks)) {
      return [];
    }

    return blocks.map((block) => ({
      roomBlockID: String(block?.roomBlockID ?? ''),
      roomBlockReason: block?.roomBlockReason,
      startDate: block?.startDate,
      endDate: block?.endDate,
      roomIDs: Array.isArray(block?.rooms)
        ? block.rooms.map((room: any) => String(room?.roomID ?? ''))
        : [],
      roomTypeIDs: Array.isArray(block?.rooms)
        ? block.rooms.map((room: any) => String(room?.roomTypeID ?? ''))
        : [],
    }));
  }
}
