"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const notification_state_schema_1 = require("./schemas/notification-state.schema");
const notifications_service_1 = require("./notifications.service");
const notifications_controller_1 = require("./notifications.controller");
const consumer_service_1 = require("./consumer.service");
const producer_service_1 = require("./producer.service");
const email_module_1 = require("./channels/email/email.module");
const sms_module_1 = require("./channels/sms/sms.module");
const push_module_1 = require("./channels/push/push.module");
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: 'NotificationState', schema: notification_state_schema_1.NotificationStateSchema }]),
            email_module_1.EmailModule,
            sms_module_1.SmsModule,
            push_module_1.PushModule,
        ],
        controllers: [notifications_controller_1.NotificationsController, consumer_service_1.ConsumerService],
        providers: [notifications_service_1.NotificationsService, producer_service_1.ProducerService],
        exports: [notifications_service_1.NotificationsService, producer_service_1.ProducerService],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map