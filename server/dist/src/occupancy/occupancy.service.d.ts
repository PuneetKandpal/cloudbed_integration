import { ConfigService } from '@nestjs/config';
import { CloudbedApiService } from '../cloudbed/cloudbed-api.service';
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
export declare class OccupancyService {
    private readonly cloudbedApi;
    private readonly configService;
    private readonly logger;
    constructor(cloudbedApi: CloudbedApiService, configService: ConfigService);
    getDailyOccupancy(params: GetDailyOccupancyParams): Promise<{
        propertyId: string;
        date: string;
        totals: {
            totalRooms: number;
            occupiedRooms: number;
            unassignedRooms: number;
            blockedRooms: number;
            occupancyRate: number;
        };
        details: {
            unassignedRooms: RoomSummary[];
            roomBlocks: RoomBlockSummary[];
        };
    }>;
    private resolveDate;
    private extractRooms;
    private formatRooms;
    private formatRoom;
    private normalizeRoomBlocks;
}
export {};
