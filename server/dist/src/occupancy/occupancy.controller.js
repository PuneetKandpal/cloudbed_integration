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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupancyController = void 0;
const common_1 = require("@nestjs/common");
const logger_service_1 = require("../common/logger/logger.service");
const occupancy_service_1 = require("./occupancy.service");
let OccupancyController = class OccupancyController {
    occupancyService;
    logger = new logger_service_1.LoggerService('OccupancyController');
    constructor(occupancyService) {
        this.occupancyService = occupancyService;
    }
    async getDailyOccupancy(propertyId, date) {
        const requestId = this.logger.generateRequestId();
        this.logger.logInfo('Received daily occupancy request', 'OccupancyController', 'getDailyOccupancy', requestId, { propertyId, date });
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
};
exports.OccupancyController = OccupancyController;
__decorate([
    (0, common_1.Get)('daily'),
    __param(0, (0, common_1.Query)('propertyId')),
    __param(1, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], OccupancyController.prototype, "getDailyOccupancy", null);
exports.OccupancyController = OccupancyController = __decorate([
    (0, common_1.Controller)('occupancy'),
    __metadata("design:paramtypes", [occupancy_service_1.OccupancyService])
], OccupancyController);
//# sourceMappingURL=occupancy.controller.js.map