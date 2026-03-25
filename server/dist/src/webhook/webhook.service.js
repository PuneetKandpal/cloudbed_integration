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
exports.WebhookService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const booking_service_1 = require("../booking/booking.service");
let WebhookService = class WebhookService {
    prisma;
    bookingService;
    logger = new logger_service_1.LoggerService('WebhookService');
    constructor(prisma, bookingService) {
        this.prisma = prisma;
        this.bookingService = bookingService;
    }
    async processWebhook(payload, headers, requestId) {
        const eventType = payload?.event || 'unknown';
        const reservationId = payload?.reservationID ||
            payload?.reservationId ||
            payload?.subReservations?.[0]?.id;
        this.logger.logInfo('Processing webhook event', 'WebhookService', 'processWebhook', requestId, { event: eventType, payload });
        let webhookEventId;
        try {
            const event = await this.prisma.webhookEvent.create({
                data: {
                    eventType,
                    eventId: requestId,
                    reservationId: reservationId ? String(reservationId) : null,
                    propertyId: payload?.propertyID_str || payload?.propertyId_str,
                    payload: payload || {},
                    headers: headers || {},
                    source: 'CLOUDBED_WEBHOOK',
                },
            });
            webhookEventId = event.id;
        }
        catch (dbError) {
            this.logger.logError('Failed to save webhook event to database', 'WebhookService', 'processWebhook', dbError, requestId);
        }
        await this.createAuditLog(payload, headers, requestId);
        switch (eventType) {
            case 'reservation/created':
                await this.handleReservationCreated(payload, requestId);
                break;
            case 'reservation/status_changed':
                await this.handleReservationStatusChanged(payload, requestId);
                break;
            case 'reservation/accommodation_status_changed':
                await this.handleAccommodationStatusChanged(payload, requestId);
                break;
            case 'reservation/accommodation_changed':
                await this.handleAccommodationChanged(payload, requestId);
                break;
            case 'guest/created':
                await this.handleGuestCreated(payload, requestId);
                break;
            case 'guest/updated':
                await this.handleGuestUpdated(payload, requestId);
                break;
            case 'reservation/deleted':
                await this.handleReservationDeleted(payload, requestId);
                break;
            default:
                this.logger.logWarn(`Unknown webhook event type: ${eventType}`, 'WebhookService', 'processWebhook', requestId, { eventType, payload });
        }
        if (webhookEventId) {
            try {
                await this.prisma.webhookEvent.update({
                    where: { id: webhookEventId },
                    data: {
                        processed: true,
                        processedAt: new Date(),
                    },
                });
            }
            catch (dbError) {
                this.logger.logError('Failed to mark webhook event as processed', 'WebhookService', 'processWebhook', dbError, requestId, { webhookEventId });
            }
        }
    }
    async handleReservationCreated(payload, requestId) {
        this.logger.logInfo('Handling reservation created event', 'WebhookService', 'handleReservationCreated', requestId, { reservationID: payload.reservationID });
        try {
            await this.bookingService.createBookingFromWebhook(payload, requestId);
            this.logger.logInfo('Successfully handled reservation created event', 'WebhookService', 'handleReservationCreated', requestId, { reservationID: payload.reservationID });
        }
        catch (error) {
            this.logger.logError('Failed to handle reservation created event', 'WebhookService', 'handleReservationCreated', error, requestId, { reservationID: payload.reservationID });
            throw error;
        }
    }
    async handleReservationStatusChanged(payload, requestId) {
        this.logger.logInfo('Handling reservation status changed event', 'WebhookService', 'handleReservationStatusChanged', requestId, {
            reservationID: payload.reservationID,
            status: payload.status,
            previousStatus: payload.previousStatus,
        });
        try {
            await this.bookingService.updateBookingStatus(payload.reservationID, payload.status, requestId);
            this.logger.logInfo('Successfully handled reservation status changed event', 'WebhookService', 'handleReservationStatusChanged', requestId, { reservationID: payload.reservationID });
        }
        catch (error) {
            this.logger.logError('Failed to handle reservation status changed event', 'WebhookService', 'handleReservationStatusChanged', error, requestId, { reservationID: payload.reservationID });
        }
    }
    async handleAccommodationStatusChanged(payload, requestId) {
        this.logger.logInfo('Handling accommodation status changed event', 'WebhookService', 'handleAccommodationStatusChanged', requestId, {
            reservationId: payload.reservationId,
            status: payload.status,
            roomId: payload.roomId,
        });
        try {
            await this.bookingService.updateRoomAssignment(payload.reservationId, payload.roomId, requestId);
        }
        catch (error) {
            this.logger.logError('Failed to handle accommodation status changed', 'WebhookService', 'handleAccommodationStatusChanged', error, requestId);
        }
    }
    async handleAccommodationChanged(payload, requestId) {
        this.logger.logInfo('Handling accommodation changed event', 'WebhookService', 'handleAccommodationChanged', requestId, {
            reservationId: payload.reservationId,
            roomId: payload.roomId,
            roomIdPrev: payload.roomIdPrev,
        });
        try {
            await this.bookingService.updateRoomAssignment(payload.reservationId, payload.roomId, requestId);
        }
        catch (error) {
            this.logger.logError('Failed to handle accommodation changed', 'WebhookService', 'handleAccommodationChanged', error, requestId);
        }
    }
    async handleGuestCreated(payload, requestId) {
        this.logger.logInfo('Handling guest created event', 'WebhookService', 'handleGuestCreated', requestId, { guestId: payload.guestId });
    }
    async handleGuestUpdated(payload, requestId) {
        this.logger.logInfo('Handling guest updated event', 'WebhookService', 'handleGuestUpdated', requestId, { guestId: payload.guestId });
    }
    async handleReservationDeleted(payload, requestId) {
        const reservationId = payload?.reservationId || payload?.reservationID;
        this.logger.logInfo('Handling reservation deleted event', 'WebhookService', 'handleReservationDeleted', requestId, { reservationId });
        try {
            const updatedBooking = await this.prisma.booking.updateMany({
                where: {
                    reservationId: String(reservationId)
                },
                data: {
                    status: 'DELETED',
                    deletedAt: new Date(),
                    deletionReason: 'Deleted via Cloudbeds webhook',
                },
            });
            if (updatedBooking.count > 0) {
                this.logger.logInfo('Successfully marked booking as deleted', 'WebhookService', 'handleReservationDeleted', requestId, {
                    reservationId,
                    bookingsUpdated: updatedBooking.count
                });
            }
            else {
                this.logger.logWarn('No booking found to mark as deleted', 'WebhookService', 'handleReservationDeleted', requestId, { reservationId });
            }
        }
        catch (error) {
            this.logger.logError('Failed to handle reservation deleted event', 'WebhookService', 'handleReservationDeleted', error, requestId, { reservationId });
        }
    }
    async createAuditLog(payload, headers, requestId) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    requestId,
                    module: 'WebhookService',
                    function: 'processWebhook',
                    message: `Received webhook event: ${payload?.event}`,
                    level: 'info',
                    inputData: {
                        payload,
                        headers,
                    },
                },
            });
        }
        catch (error) {
            this.logger.logError('Failed to create audit log', 'WebhookService', 'createAuditLog', error, requestId);
        }
    }
};
exports.WebhookService = WebhookService;
exports.WebhookService = WebhookService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        booking_service_1.BookingService])
], WebhookService);
//# sourceMappingURL=webhook.service.js.map