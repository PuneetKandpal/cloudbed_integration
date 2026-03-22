"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupancyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const date_fns_1 = require("date-fns");
const cloudbed_api_service_1 = require("../cloudbed/cloudbed-api.service");
const logger_service_1 = require("../common/logger/logger.service");
let OccupancyService = class OccupancyService {
    cloudbedApi;
    configService;
    logger = new logger_service_1.LoggerService('OccupancyService');
    constructor(cloudbedApi, configService) {
        this.cloudbedApi = cloudbedApi;
        this.configService = configService;
    }
    async getDailyOccupancy(params) {
        const { propertyId, date, requestId } = params;
        const resolvedPropertyId = propertyId || this.configService.get('CLOUDBED_PROPERTY_ID');
        if (!resolvedPropertyId) {
            throw new common_1.BadRequestException('propertyId is required (env CLOUDBED_PROPERTY_ID or query parameter)');
        }
        const targetDate = this.resolveDate(date);
        const dateString = (0, date_fns_1.format)(targetDate, 'yyyy-MM-dd');
        const nextDateString = (0, date_fns_1.format)((0, date_fns_1.addDays)(targetDate, 1), 'yyyy-MM-dd');
        this.logger.logInfo('Fetching occupancy snapshot', 'OccupancyService', 'getDailyOccupancy', requestId, { propertyId: resolvedPropertyId, date: dateString });
        const [allRoomsPayload, unassignedRoomsPayload, roomBlocksPayload] = await Promise.all([
            this.cloudbedApi.getRooms({ propertyIDs: resolvedPropertyId }, requestId),
            this.cloudbedApi.getRooms({
                propertyIDs: resolvedPropertyId,
                startDate: dateString,
                endDate: nextDateString,
            }, requestId),
            this.cloudbedApi.getRoomBlocks({
                propertyID: resolvedPropertyId,
                startDate: dateString,
                endDate: nextDateString,
            }, requestId),
        ]);
        const allRooms = this.extractRooms(allRoomsPayload);
        const unassignedRooms = this.extractRooms(unassignedRoomsPayload);
        const roomBlocks = this.normalizeRoomBlocks(roomBlocksPayload);
        const physicalRooms = allRooms.filter((room) => !room.isVirtual);
        const unassignedPhysicalRooms = unassignedRooms.filter((room) => !room.isVirtual);
        const totalRooms = physicalRooms.length;
        const unassignedRoomsCount = unassignedPhysicalRooms.length;
        const blockedRoomsCount = roomBlocks.reduce((acc, block) => acc + block.roomIDs.length, 0);
        const occupiedRooms = Math.max(totalRooms - unassignedRoomsCount, 0);
        const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;
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
        this.logger.logInfo('Occupancy snapshot ready', 'OccupancyService', 'getDailyOccupancy', requestId, {}, response.totals);
        return response;
    }
    resolveDate(date) {
        if (!date) {
            return new Date();
        }
        const parsed = (0, date_fns_1.parseISO)(date);
        if (!(0, date_fns_1.isValid)(parsed)) {
            throw new common_1.BadRequestException('Invalid date format. Use YYYY-MM-DD');
        }
        return parsed;
    }
    extractRooms(payload) {
        if (!Array.isArray(payload)) {
            return [];
        }
        return payload.flatMap((property) => {
            if (!Array.isArray(property?.rooms)) {
                return [];
            }
            return property.rooms.map((room) => this.formatRoom(room));
        });
    }
    formatRooms(rooms) {
        return rooms.map((room) => this.formatRoom(room));
    }
    formatRoom(room) {
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
    normalizeRoomBlocks(blocks) {
        if (!Array.isArray(blocks)) {
            return [];
        }
        return blocks.map((block) => ({
            roomBlockID: String(block?.roomBlockID ?? ''),
            roomBlockReason: block?.roomBlockReason,
            startDate: block?.startDate,
            endDate: block?.endDate,
            roomIDs: Array.isArray(block?.rooms)
                ? block.rooms.map((room) => String(room?.roomID ?? ''))
                : [],
            roomTypeIDs: Array.isArray(block?.rooms)
                ? block.rooms.map((room) => String(room?.roomTypeID ?? ''))
                : [],
        }));
    }
};
exports.OccupancyService = OccupancyService;
exports.OccupancyService = OccupancyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [cloudbed_api_service_1.CloudbedApiService,
        config_1.ConfigService])
], OccupancyService);
//# sourceMappingURL=occupancy.service.js.map