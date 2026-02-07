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
var NotificationsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const common_2 = require("../../../libs/common/src");
const notification_state_schema_1 = require("./schemas/notification-state.schema");
const email_service_1 = require("./channels/email/email.service");
const sms_service_1 = require("./channels/sms/sms.service");
const push_service_1 = require("./channels/push/push.service");
let NotificationsService = NotificationsService_1 = class NotificationsService {
    constructor(notificationStateModel, logger, emailService, smsService, pushService) {
        this.notificationStateModel = notificationStateModel;
        this.logger = logger;
        this.emailService = emailService;
        this.smsService = smsService;
        this.pushService = pushService;
        this.logger.setContext(NotificationsService_1.name);
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = NotificationsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(notification_state_schema_1.NotificationState.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        common_2.AppLogger,
        email_service_1.EmailService,
        sms_service_1.SmsService,
        push_service_1.PushService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map