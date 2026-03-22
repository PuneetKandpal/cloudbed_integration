"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const prisma_module_1 = require("./prisma/prisma.module");
const webhook_module_1 = require("./webhook/webhook.module");
const booking_module_1 = require("./booking/booking.module");
const cloudbed_module_1 = require("./cloudbed/cloudbed.module");
const payment_module_1 = require("./payment/payment.module");
const risk_module_1 = require("./risk/risk.module");
const email_module_1 = require("./email/email.module");
const cancellation_policy_module_1 = require("./cancellation-policy/cancellation-policy.module");
const scheduler_module_1 = require("./scheduler/scheduler.module");
const occupancy_module_1 = require("./occupancy/occupancy.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: '.env',
            }),
            schedule_1.ScheduleModule.forRoot(),
            prisma_module_1.PrismaModule,
            webhook_module_1.WebhookModule,
            booking_module_1.BookingModule,
            cloudbed_module_1.CloudbedModule,
            payment_module_1.PaymentModule,
            risk_module_1.RiskModule,
            email_module_1.EmailModule,
            cancellation_policy_module_1.CancellationPolicyModule,
            scheduler_module_1.SchedulerModule,
            occupancy_module_1.OccupancyModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map