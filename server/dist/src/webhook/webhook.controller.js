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
exports.WebhookController = void 0;
const common_1 = require("@nestjs/common");
const webhook_service_1 = require("./webhook.service");
const logger_service_1 = require("../common/logger/logger.service");
let WebhookController = class WebhookController {
    webhookService;
    logger = new logger_service_1.LoggerService('WebhookController');
    constructor(webhookService) {
        this.webhookService = webhookService;
    }
    async handleWebhook(payload, headers) {
        const requestId = this.logger.generateRequestId();
        this.logger.logInfo('Received Cloudbed webhook event', 'WebhookController', 'handleWebhook', requestId, {
            event: payload?.event,
            reservationID: payload?.reservationID || payload?.reservationId,
            propertyID: payload?.propertyID,
        });
        try {
            await this.webhookService.processWebhook(payload, headers, requestId);
            this.logger.logInfo('Successfully processed webhook event', 'WebhookController', 'handleWebhook', requestId, { event: payload?.event });
            return {
                status: 'success',
                message: 'Webhook processed successfully',
                requestId,
            };
        }
        catch (error) {
            this.logger.logError('Failed to process webhook event', 'WebhookController', 'handleWebhook', error, requestId, { event: payload?.event });
            return {
                status: 'error',
                message: 'Failed to process webhook',
                requestId,
            };
        }
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "handleWebhook", null);
exports.WebhookController = WebhookController = __decorate([
    (0, common_1.Controller)('cloudbeds/webhook'),
    __metadata("design:paramtypes", [webhook_service_1.WebhookService])
], WebhookController);
//# sourceMappingURL=webhook.controller.js.map