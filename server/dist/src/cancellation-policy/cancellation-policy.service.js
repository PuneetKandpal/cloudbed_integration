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
exports.CancellationPolicyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
let CancellationPolicyService = class CancellationPolicyService {
    prisma;
    logger = new logger_service_1.LoggerService('CancellationPolicyService');
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCancellationPolicy(propertyId, requestId) {
        this.logger.logInfo('Fetching cancellation policy', 'CancellationPolicyService', 'getCancellationPolicy', requestId, { propertyId });
        if (propertyId) {
            const policy = await this.prisma.cancellationPolicy.findUnique({
                where: { propertyId },
            });
            if (policy) {
                return policy;
            }
        }
        const globalPolicy = await this.prisma.cancellationPolicy.findFirst({
            where: { propertyId: null },
        });
        if (globalPolicy) {
            return globalPolicy;
        }
        const defaultPolicy = await this.prisma.cancellationPolicy.create({
            data: {
                propertyId: null,
                daysBeforeCheckin: 2,
            },
        });
        this.logger.logInfo('Created default global cancellation policy', 'CancellationPolicyService', 'getCancellationPolicy', requestId, { policyId: defaultPolicy.id, daysBeforeCheckin: defaultPolicy.daysBeforeCheckin });
        return defaultPolicy;
    }
    async updateCancellationPolicy(propertyId, daysBeforeCheckin, requestId) {
        this.logger.logInfo('Updating cancellation policy', 'CancellationPolicyService', 'updateCancellationPolicy', requestId, { propertyId, daysBeforeCheckin });
        const existingPolicy = propertyId
            ? await this.prisma.cancellationPolicy.findUnique({
                where: { propertyId },
            })
            : await this.prisma.cancellationPolicy.findFirst({
                where: { propertyId: null },
            });
        if (existingPolicy) {
            const updated = await this.prisma.cancellationPolicy.update({
                where: { id: existingPolicy.id },
                data: { daysBeforeCheckin },
            });
            this.logger.logInfo('Updated existing cancellation policy', 'CancellationPolicyService', 'updateCancellationPolicy', requestId, { policyId: updated.id, daysBeforeCheckin: updated.daysBeforeCheckin });
            return updated;
        }
        const created = await this.prisma.cancellationPolicy.create({
            data: {
                propertyId,
                daysBeforeCheckin,
            },
        });
        this.logger.logInfo('Created new cancellation policy', 'CancellationPolicyService', 'updateCancellationPolicy', requestId, { policyId: created.id, daysBeforeCheckin: created.daysBeforeCheckin });
        return created;
    }
    async deleteCancellationPolicy(propertyId, requestId) {
        this.logger.logInfo('Deleting cancellation policy', 'CancellationPolicyService', 'deleteCancellationPolicy', requestId, { propertyId });
        const policy = propertyId
            ? await this.prisma.cancellationPolicy.findUnique({
                where: { propertyId },
            })
            : await this.prisma.cancellationPolicy.findFirst({
                where: { propertyId: null },
            });
        if (!policy) {
            throw new Error('Cancellation policy not found');
        }
        await this.prisma.cancellationPolicy.delete({
            where: { id: policy.id },
        });
        this.logger.logInfo('Deleted cancellation policy', 'CancellationPolicyService', 'deleteCancellationPolicy', requestId, { policyId: policy.id });
        return { success: true, deletedPolicyId: policy.id };
    }
};
exports.CancellationPolicyService = CancellationPolicyService;
exports.CancellationPolicyService = CancellationPolicyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CancellationPolicyService);
//# sourceMappingURL=cancellation-policy.service.js.map