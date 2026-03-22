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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudbedApiService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const logger_service_1 = require("../common/logger/logger.service");
const axios_1 = __importDefault(require("axios"));
let CloudbedApiService = class CloudbedApiService {
    config;
    logger = new logger_service_1.LoggerService('CloudbedApiService');
    httpClient;
    apiUrl;
    apiKey;
    constructor(config) {
        this.config = config;
        this.apiUrl =
            this.config.get('CLOUDBED_API_URL') || 'https://api.cloudbeds.com';
        this.apiKey = this.config.get('CLOUDBED_API_KEY') || '';
        this.httpClient = axios_1.default.create({
            baseURL: this.apiUrl,
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }
    async generatePaymentLink(params, requestId) {
        const { reservationId, propertyId } = params;
        this.logger.logInfo('Generating payment link for reservation', 'CloudbedApiService', 'generatePaymentLink', requestId, { reservationId, propertyId });
        const template = this.config.get('PAYMENT_LINK_TEMPLATE') || '';
        if (template) {
            return template.replace('{reservationId}', encodeURIComponent(reservationId));
        }
        return `${this.apiUrl}/reservation/${encodeURIComponent(reservationId)}/payment`;
    }
    async getRooms(params, requestId) {
        this.logger.logInfo('Fetching rooms from Cloudbed', 'CloudbedApiService', 'getRooms', requestId, params);
        try {
            const response = await this.httpClient.get(`/api/v1.3/getRooms`, {
                params,
            });
            const roomData = Array.isArray(response.data?.data)
                ? response.data.data
                : [];
            this.logger.logInfo('Successfully fetched rooms from Cloudbed', 'CloudbedApiService', 'getRooms', requestId, {
                status: response.status,
                propertyCount: roomData.length,
            }, response.data);
            return roomData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch rooms from Cloudbed', 'CloudbedApiService', 'getRooms', error, requestId, params);
            throw new common_1.HttpException('Unable to fetch rooms from Cloudbed', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getRoomBlocks(params, requestId) {
        this.logger.logInfo('Fetching room blocks from Cloudbed', 'CloudbedApiService', 'getRoomBlocks', requestId, params);
        try {
            const response = await this.httpClient.get(`/api/v1.3/getRoomBlocks`, {
                params,
            });
            const blockData = Array.isArray(response.data?.data)
                ? response.data.data
                : [];
            this.logger.logInfo('Successfully fetched room blocks from Cloudbed', 'CloudbedApiService', 'getRoomBlocks', requestId, {
                status: response.status,
                blockCount: blockData.length,
            }, response.data);
            return blockData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch room blocks from Cloudbed', 'CloudbedApiService', 'getRoomBlocks', error, requestId, params);
            throw new common_1.HttpException('Unable to fetch room blocks from Cloudbed', common_1.HttpStatus.BAD_GATEWAY);
        }
    }
    async getReservation(reservationId, requestId) {
        this.logger.logInfo('Fetching reservation from Cloudbed', 'CloudbedApiService', 'getReservation', requestId, { reservationId });
        try {
            const response = await this.httpClient.get(`/api/v1.3/getReservation`, {
                params: { reservationID: reservationId, includeRatePlans: true },
            });
            const reservationData = response.data?.data ?? response.data;
            const reservationKeys = typeof reservationData === 'object' && reservationData !== null
                ? Object.keys(reservationData)
                : [];
            const includeRatePlansCount = Array.isArray((reservationData)?.ratePlans)
                ? (reservationData).ratePlans.length
                : undefined;
            const fullReservationResponse = reservationData;
            this.logger.logInfo('Successfully fetched reservation', 'CloudbedApiService', 'getReservation', requestId, {
                reservationId,
                status: response.status,
                topLevelKeys: reservationKeys,
                ratePlansCount: includeRatePlansCount,
                fullResponse: fullReservationResponse,
            });
            return reservationData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch reservation from Cloudbed', 'CloudbedApiService', 'getReservation', error, requestId, { reservationId });
            return this.getMockReservationData(reservationId);
        }
    }
    async getReservationsWithRateDetails(reservationId, requestId) {
        this.logger.logInfo('Fetching reservation rate details from Cloudbed', 'CloudbedApiService', 'getReservationsWithRateDetails', requestId, { reservationId });
        try {
            const response = await this.httpClient.get(`/api/v1.3/getReservationsWithRateDetails`, {
                params: { reservationID: reservationId },
            });
            const first = Array.isArray(response.data?.data) ? response.data.data[0] : null;
            const detailsData = first ?? response.data?.data ?? response.data ?? null;
            const rooms = Array.isArray((detailsData)?.rooms)
                ? (detailsData).rooms
                : [];
            const rateNames = rooms
                .map((r) => String(r?.rateName ?? ''))
                .filter(Boolean);
            const fullRateDetailsResponse = detailsData;
            this.logger.logInfo('Successfully fetched reservation rate details from Cloudbed', 'CloudbedApiService', 'getReservationsWithRateDetails', requestId, {
                reservationId,
                status: response.status,
                roomsCount: rooms.length,
                rateNamesSample: rateNames.slice(0, 5),
                fullResponse: fullRateDetailsResponse,
            });
            return detailsData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch reservation rate details from Cloudbed', 'CloudbedApiService', 'getReservationsWithRateDetails', error, requestId, { reservationId });
            return null;
        }
    }
    async getGuestByReservation(reservationId, requestId) {
        this.logger.logInfo('Fetching guest by reservation ID from Cloudbed', 'CloudbedApiService', 'getGuestByReservation', requestId, { reservationId });
        try {
            const response = await this.httpClient.get(`/api/v1.3/getGuest`, {
                params: { reservationID: reservationId },
            });
            const guestData = response.data?.data ?? response.data;
            this.logger.logInfo('Successfully fetched guest data from Cloudbed', 'CloudbedApiService', 'getGuestByReservation', requestId, {
                reservationId,
                guestID: guestData?.guestID,
                email: guestData?.email,
                hasSpecialRequests: !!guestData?.specialRequests,
                fullResponse: guestData,
            });
            return guestData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch guest by reservation from Cloudbed', 'CloudbedApiService', 'getGuestByReservation', error, requestId, { reservationId });
            return null;
        }
    }
    async getGuest(guestId, requestId) {
        this.logger.logInfo('Fetching guest from Cloudbed', 'CloudbedApiService', 'getGuest', requestId, { guestId });
        try {
            const response = await this.httpClient.get(`/api/v1.2/getGuest`, {
                params: { guestID: guestId },
            });
            const guestData = response.data?.data ?? response.data;
            this.logger.logInfo('Successfully fetched guest data', 'CloudbedApiService', 'getGuest', requestId, {
                guestId,
                email: guestData?.email,
                fullResponse: guestData,
            });
            return guestData;
        }
        catch (error) {
            this.logger.logError('Failed to fetch guest from Cloudbed', 'CloudbedApiService', 'getGuest', error, requestId);
            return null;
        }
    }
    async getRatePlans(params, requestId) {
        this.logger.logInfo('Fetching rate plans from Cloudbed', 'CloudbedApiService', 'getRatePlans', requestId, params);
        try {
            const response = await this.httpClient.get(`/api/v1.3/getRatePlans`, {
                params: {
                    ...params,
                    detailedRates: params.detailedRates ?? true,
                },
            });
            this.logger.logInfo('Successfully fetched rate plans from Cloudbed', 'CloudbedApiService', 'getRatePlans', requestId, {
                status: response.status,
                count: Array.isArray(response.data?.data)
                    ? response.data.data.length
                    : 0,
            });
            return response.data?.data ?? response.data ?? [];
        }
        catch (error) {
            this.logger.logError('Failed to fetch rate plans from Cloudbed', 'CloudbedApiService', 'getRatePlans', error, requestId, params);
            return [];
        }
    }
    async getCurrencySettings(requestId) {
        this.logger.logInfo('Fetching currency settings from Cloudbed', 'CloudbedApiService', 'getCurrencySettings', requestId, {});
        try {
            const response = await this.httpClient.get(`/api/v1.3/getCurrencySettings`);
            const currencySettings = response.data?.data ?? response.data;
            this.logger.logInfo('Successfully fetched currency settings from Cloudbed', 'CloudbedApiService', 'getCurrencySettings', requestId, {
                status: response.status,
                defaultCurrency: currencySettings?.default,
                hasFormat: !!currencySettings?.format,
                fullResponse: currencySettings,
            });
            return currencySettings;
        }
        catch (error) {
            this.logger.logError('Failed to fetch currency settings from Cloudbed', 'CloudbedApiService', 'getCurrencySettings', error, requestId);
            return null;
        }
    }
    getMockReservationData(reservationId) {
        return {
            reservationID: reservationId,
            propertyName: 'Test Property',
            propertyAddress: '123 Test St, City, Country',
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 86400000).toISOString(),
            numberOfGuests: 2,
            balance: 100.0,
            currency: 'USD',
            ratePlan: 'Flexible Rate',
            specialRequests: 'Free cancellation until 2 days before check-in',
            description: 'Standard room with flexible cancellation',
        };
    }
};
exports.CloudbedApiService = CloudbedApiService;
exports.CloudbedApiService = CloudbedApiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], CloudbedApiService);
//# sourceMappingURL=cloudbed-api.service.js.map