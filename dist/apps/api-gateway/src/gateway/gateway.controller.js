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
exports.GatewayController = void 0;
const common_1 = require("@nestjs/common");
const gateway_service_1 = require("./gateway.service");
let GatewayController = class GatewayController {
    constructor(gatewayService) {
        this.gatewayService = gatewayService;
    }
    getHealth() {
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            services: this.gatewayService.getAllServices().map(s => ({
                name: s.name,
                prefix: s.prefix,
                url: `http://${s.baseUrl}:${s.port}`,
            })),
        };
    }
    async proxyBooking(req, res) {
        await this.proxyToService('booking', req, res);
    }
    async proxyCloudbeds(req, res) {
        await this.proxyToService('cloudbeds', req, res);
    }
    async proxyPayment(req, res) {
        await this.proxyToService('payment', req, res);
    }
    async proxyNotification(req, res) {
        await this.proxyToService('notification', req, res);
    }
    async proxyAudit(req, res) {
        await this.proxyToService('audit', req, res);
    }
    async proxyBookingPolicy(req, res) {
        await this.proxyToService('booking-policy', req, res);
    }
    async proxyToService(serviceName, req, res) {
        try {
            const path = req.url;
            const method = req.method;
            const headers = req.headers;
            const query = req.query;
            const body = req.body;
            const response = await this.gatewayService.proxyRequest(serviceName, path, method, headers, body, query);
            Object.entries(response.headers || {}).forEach(([key, value]) => {
                if (typeof value === 'string') {
                    res.setHeader(key, value);
                }
            });
            res.status(response.status || 200).json(response.data);
        }
        catch (error) {
            console.error(`Gateway error proxying to ${serviceName}:`, error);
            if (error instanceof Error) {
                throw new common_1.HttpException({
                    message: `Service ${serviceName} unavailable`,
                    error: error.message,
                    timestamp: new Date().toISOString(),
                }, common_1.HttpStatus.BAD_GATEWAY);
            }
            throw new common_1.HttpException('Internal Server Error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.GatewayController = GatewayController;
__decorate([
    (0, common_1.Get)('api/health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GatewayController.prototype, "getHealth", null);
__decorate([
    (0, common_1.All)('api/booking/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyBooking", null);
__decorate([
    (0, common_1.All)('api/cloudbeds/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyCloudbeds", null);
__decorate([
    (0, common_1.All)('api/payment/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyPayment", null);
__decorate([
    (0, common_1.All)('api/notification/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyNotification", null);
__decorate([
    (0, common_1.All)('api/audit/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyAudit", null);
__decorate([
    (0, common_1.All)('api/booking-policy/*'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Response)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GatewayController.prototype, "proxyBookingPolicy", null);
exports.GatewayController = GatewayController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [gateway_service_1.GatewayService])
], GatewayController);
//# sourceMappingURL=gateway.controller.js.map