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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let AuditService = class AuditService {
    constructor(auditModel) {
        this.auditModel = auditModel;
    }
    async recordEvent(eventName, payload, source, correlationId) {
        console.log(`💾 Recording audit event: ${eventName}`);
        await this.auditModel.create({
            eventType: eventName,
            source,
            correlationId: correlationId || null,
            guest: {
                firstName: payload.rawPayload?.data?.reservation?.guests?.[0]?.firstName || null,
                lastName: payload.rawPayload?.data?.reservation?.guests?.[0]?.lastName || null,
                email: null,
            },
            booking: {
                reservationId: payload.reservationId || null,
                checkInDate: payload.checkInDate || null,
                checkOutDate: payload.checkOutDate || null,
                status: payload.rawPayload?.data?.reservation?.status || null,
            },
            payment: {
                status: 'NOT_ATTEMPTED',
                attempts: [],
                paymentLink: null,
            },
            pricing: {
                totalAmount: payload.rawPayload?.data?.reservation?.totalAmount || null,
                currency: payload.rawPayload?.data?.reservation?.currency || null,
                promotions: [],
            },
            financial: {
                grossAmount: payload.rawPayload?.data?.reservation?.totalAmount || null,
                netAmount: null,
                tax: null,
            },
            communications: {
                emails: [],
            },
            rawPayload: payload.rawPayload,
            timestamps: {
                eventReceivedAt: payload.timestamp || new Date().toISOString(),
                storedAt: new Date().toISOString(),
            },
        });
        console.log('✅ Audit record stored successfully');
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('BookingAudit')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AuditService);
//# sourceMappingURL=audit.service.js.map