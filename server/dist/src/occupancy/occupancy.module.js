"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OccupancyModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const occupancy_controller_1 = require("./occupancy.controller");
const occupancy_service_1 = require("./occupancy.service");
const cloudbed_module_1 = require("../cloudbed/cloudbed.module");
let OccupancyModule = class OccupancyModule {
};
exports.OccupancyModule = OccupancyModule;
exports.OccupancyModule = OccupancyModule = __decorate([
    (0, common_1.Module)({
        imports: [config_1.ConfigModule, cloudbed_module_1.CloudbedModule],
        controllers: [occupancy_controller_1.OccupancyController],
        providers: [occupancy_service_1.OccupancyService],
        exports: [occupancy_service_1.OccupancyService],
    })
], OccupancyModule);
//# sourceMappingURL=occupancy.module.js.map