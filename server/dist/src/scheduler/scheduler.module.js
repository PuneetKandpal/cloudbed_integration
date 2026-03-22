"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerModule = void 0;
const common_1 = require("@nestjs/common");
const scheduler_service_1 = require("./scheduler.service");
const scheduler_controller_1 = require("./scheduler.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const payment_module_1 = require("../payment/payment.module");
const email_module_1 = require("../email/email.module");
const risk_module_1 = require("../risk/risk.module");
const occupancy_module_1 = require("../occupancy/occupancy.module");
const cloudbed_module_1 = require("../cloudbed/cloudbed.module");
let SchedulerModule = class SchedulerModule {
};
exports.SchedulerModule = SchedulerModule;
exports.SchedulerModule = SchedulerModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, payment_module_1.PaymentModule, email_module_1.EmailModule, risk_module_1.RiskModule, occupancy_module_1.OccupancyModule, cloudbed_module_1.CloudbedModule],
        controllers: [scheduler_controller_1.SchedulerController],
        providers: [scheduler_service_1.SchedulerService],
        exports: [scheduler_service_1.SchedulerService],
    })
], SchedulerModule);
//# sourceMappingURL=scheduler.module.js.map