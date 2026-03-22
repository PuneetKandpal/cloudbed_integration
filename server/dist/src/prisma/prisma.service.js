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
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const logger_service_1 = require("../common/logger/logger.service");
let PrismaService = class PrismaService extends client_1.PrismaClient {
    logger = new logger_service_1.LoggerService('PrismaService');
    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'event', level: 'error' },
                { emit: 'event', level: 'warn' },
            ],
        });
    }
    async onModuleInit() {
        const requestId = this.logger.generateRequestId();
        this.logger.logInfo('Connecting to database...', 'PrismaService', 'onModuleInit', requestId);
        try {
            await this.$connect();
            this.logger.logInfo('Successfully connected to database', 'PrismaService', 'onModuleInit', requestId);
        }
        catch (error) {
            this.logger.logError('Failed to connect to database', 'PrismaService', 'onModuleInit', error, requestId);
            throw error;
        }
    }
    async onModuleDestroy() {
        const requestId = this.logger.generateRequestId();
        this.logger.logInfo('Disconnecting from database...', 'PrismaService', 'onModuleDestroy', requestId);
        await this.$disconnect();
        this.logger.logInfo('Successfully disconnected from database', 'PrismaService', 'onModuleDestroy', requestId);
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map