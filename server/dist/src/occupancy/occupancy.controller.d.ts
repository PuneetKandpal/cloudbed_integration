import { OccupancyService } from './occupancy.service';
export declare class OccupancyController {
    private readonly occupancyService;
    private readonly logger;
    constructor(occupancyService: OccupancyService);
    getDailyOccupancy(propertyId?: string, date?: string): Promise<{
        status: string;
        requestId: string;
        data: {
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
                unassignedRooms: {
                    roomID: string;
                    roomName: string;
                    roomTypeID: string;
                    roomTypeName: string;
                    isPrivate: boolean;
                    isVirtual: boolean;
                    maxGuests: number;
                    roomBlocked?: boolean;
                }[];
                roomBlocks: {
                    roomBlockID: string;
                    roomBlockReason?: string;
                    startDate?: string;
                    endDate?: string;
                    roomIDs: string[];
                    roomTypeIDs: string[];
                }[];
            };
        };
    }>;
}
