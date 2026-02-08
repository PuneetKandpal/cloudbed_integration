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
exports.GatewayService = void 0;
const common_1 = require("@nestjs/common");
let GatewayService = class GatewayService {
    constructor() {
        this.services = new Map();
        this.initializeServices();
    }
    initializeServices() {
        const services = [
            {
                name: 'booking',
                baseUrl: process.env.BOOKING_SERVICE_URL || 'localhost',
                port: parseInt(process.env.BOOKING_SERVICE_PORT || '3007'),
                prefix: '/api/booking',
            },
            {
                name: 'cloudbeds',
                baseUrl: process.env.CLOUDBEDS_SERVICE_URL || 'localhost',
                port: parseInt(process.env.CLOUDBEDS_SERVICE_PORT || '3002'),
                prefix: '/api/cloudbeds',
            },
            {
                name: 'payment',
                baseUrl: process.env.PAYMENT_SERVICE_URL || 'localhost',
                port: parseInt(process.env.PAYMENT_SERVICE_PORT || '3009'),
                prefix: '/api/payment',
            },
            {
                name: 'notification',
                baseUrl: process.env.NOTIFICATION_SERVICE_URL || 'localhost',
                port: parseInt(process.env.NOTIFICATION_SERVICE_PORT || '3011'),
                prefix: '/api/notification',
            },
            {
                name: 'audit',
                baseUrl: process.env.AUDIT_SERVICE_URL || 'localhost',
                port: parseInt(process.env.AUDIT_SERVICE_PORT || '3005'),
                prefix: '/api/audit',
            },
            {
                name: 'booking-policy',
                baseUrl: process.env.BOOKING_POLICY_SERVICE_URL || 'localhost',
                port: parseInt(process.env.BOOKING_POLICY_SERVICE_PORT || '3008'),
                prefix: '/api/booking-policy',
            },
        ];
        services.forEach(service => {
            this.services.set(service.name, service);
        });
    }
    getServiceConfig(serviceName) {
        return this.services.get(serviceName);
    }
    async proxyRequest(serviceName, path, method, headers, body, query) {
        const service = this.getServiceConfig(serviceName);
        if (!service) {
            throw new Error(`Service ${serviceName} not found`);
        }
        const url = `http://${service.baseUrl}:${service.port}${path}`;
        try {
            const response = await fetch(url, {
                method,
                headers: this.sanitizeHeaders(headers),
                body: body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase()) ? JSON.stringify(body) : undefined,
            });
            if (!response.ok) {
                throw new Error(`Service ${serviceName} error: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            throw new Error(`Service ${serviceName} error: ${error.message}`);
        }
    }
    sanitizeHeaders(headers) {
        const sanitized = { ...headers };
        delete sanitized['host'];
        delete sanitized['content-length'];
        return sanitized;
    }
    getAllServices() {
        return Array.from(this.services.values());
    }
};
exports.GatewayService = GatewayService;
exports.GatewayService = GatewayService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], GatewayService);
//# sourceMappingURL=gateway.service.js.map