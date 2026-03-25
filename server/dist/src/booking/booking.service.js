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
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const cloudbed_api_service_1 = require("../cloudbed/cloudbed-api.service");
const payment_service_1 = require("../payment/payment.service");
const risk_assessment_service_1 = require("../risk/risk-assessment.service");
const cancellation_policy_service_1 = require("../cancellation-policy/cancellation-policy.service");
let BookingService = class BookingService {
    prisma;
    cloudbedApi;
    paymentService;
    riskService;
    cancellationPolicyService;
    logger = new logger_service_1.LoggerService('BookingService');
    constructor(prisma, cloudbedApi, paymentService, riskService, cancellationPolicyService) {
        this.prisma = prisma;
        this.cloudbedApi = cloudbedApi;
        this.paymentService = paymentService;
        this.riskService = riskService;
        this.cancellationPolicyService = cancellationPolicyService;
    }
    parseCloudbedsDate(value, source) {
        const raw = String(value ?? '').trim();
        if (!raw) {
            return new Date();
        }
        const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const year = Number(dateOnlyMatch[1]);
            const month = Number(dateOnlyMatch[2]);
            const day = Number(dateOnlyMatch[3]);
            return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        }
        try {
            return (0, date_fns_1.parseISO)(raw);
        }
        catch {
            this.logger.logWarn('Failed to parse Cloudbeds date string; falling back to Date constructor', 'BookingService', 'parseCloudbedsDate', this.logger.generateRequestId(), { source, raw });
            return new Date(raw);
        }
    }
    async createBookingFromWebhook(payload, requestId) {
        this.logger.logInfo('Creating booking from webhook', 'BookingService', 'createBookingFromWebhook', requestId, { reservationID: payload.reservationID });
        try {
            const existing = await this.prisma.booking.findUnique({
                where: { reservationId: payload.reservationID },
            });
            if (existing) {
                this.logger.logWarn('Booking already exists, skipping creation', 'BookingService', 'createBookingFromWebhook', requestId, { reservationID: payload.reservationID });
                return;
            }
            const reservationRateDetails = await this.cloudbedApi.getReservationsWithRateDetails(payload.reservationID, requestId);
            this.logger.logInfo('Cloudbeds getReservationsWithRateDetails (single source of truth)', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                fullResponse: reservationRateDetails,
            });
            const rateDetailsObj = typeof reservationRateDetails === 'object' && reservationRateDetails !== null
                ? reservationRateDetails
                : {};
            const rawSource = rateDetailsObj?.source;
            const reservationSourceNameRaw = typeof rawSource === 'string'
                ? rawSource
                : rawSource?.name ?? rateDetailsObj?.sourceName;
            const reservationSourceName = String(reservationSourceNameRaw ?? '').trim();
            const hostelworldSourceName = "hostelworld";
            if (reservationSourceName.toLowerCase() !== hostelworldSourceName) {
                this.logger.logInfo('Skipping booking creation (non-Hostelworld reservation)', 'BookingService', 'createBookingFromWebhook', requestId, {
                    reservationID: payload.reservationID,
                    reservationSourceName,
                    rawSource,
                });
                return;
            }
            const reservationRateDetailsRecord = rateDetailsObj;
            const rooms = Array.isArray(reservationRateDetailsRecord?.rooms)
                ? reservationRateDetailsRecord.rooms
                : [];
            let reservationDetailedRoomRateNames = rooms
                .flatMap((r) => {
                const mapObj = r?.detailedRoomRateNames;
                if (typeof mapObj !== 'object' || mapObj === null) {
                    return [];
                }
                return Object.values(mapObj).map((v) => String(v ?? ''));
            })
                .filter(Boolean);
            if (reservationDetailedRoomRateNames.length === 0) {
                this.logger.logInfo('No detailedRoomRateNames found - defaulting to flexible rate', 'BookingService', 'createBookingFromWebhook', requestId, {
                    reservationID: payload.reservationID,
                    sourceName: reservationSourceName,
                    roomsCount: rooms.length,
                });
                reservationDetailedRoomRateNames = ['Flexible'];
            }
            const startDateStr = String(rateDetailsObj?.reservationCheckIn ?? '');
            const endDateStr = String(rateDetailsObj?.reservationCheckOut ?? '');
            const startDate = startDateStr
                ? this.parseCloudbedsDate(startDateStr, 'rateDetails.reservationCheckIn')
                : new Date();
            const endDate = endDateStr
                ? this.parseCloudbedsDate(endDateStr, 'rateDetails.reservationCheckOut')
                : (0, date_fns_1.addDays)(startDate, 1);
            this.logger.logInfo('Resolved reservation dates from rate details', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                reservationCheckIn: startDateStr,
                reservationCheckOut: endDateStr,
                startDate,
                endDate,
            });
            const now = new Date();
            const isSameDay = (0, date_fns_1.differenceInHours)(startDate, now) <= 24;
            const totalAmount = Number(rateDetailsObj?.total ?? 0);
            const remainingBalance = Number(rateDetailsObj?.balance ?? totalAmount);
            const currency = String(rateDetailsObj?.propertyCurrency ?? 'USD');
            const paidFromBalanceDetailed = Number(rateDetailsObj?.balanceDetailed?.paid ?? Number.NaN);
            const computedPaid = totalAmount - remainingBalance;
            const paidAmount = Number.isFinite(paidFromBalanceDetailed)
                ? paidFromBalanceDetailed
                : Math.max(computedPaid, 0);
            this.logger.logInfo('Reservation financial data from rate details', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                totalAmount,
                remainingBalance,
                currency,
                paidFromBalanceDetailed,
                computedPaid,
                paidAmount,
            });
            const reservationPlanText = `${reservationDetailedRoomRateNames.join(' ')}`
                .toLowerCase()
                .trim();
            this.logger.logInfo('Cloudbeds reservation rate names extracted', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                roomsCount: rooms.length,
                detailedRoomRateNamesCount: reservationDetailedRoomRateNames.length,
                detailedRoomRateNamesSample: reservationDetailedRoomRateNames.slice(0, 5),
            });
            const hasNonRefundableKeyword = reservationPlanText.includes('non-refundable') ||
                reservationPlanText.includes('non refundable') ||
                reservationPlanText.includes('nonrefundable');
            const hasFlexibleKeyword = reservationPlanText.includes('flexible') ||
                reservationPlanText.includes('refundable') ||
                reservationPlanText.includes('standard rate');
            const policyTypeFromReservationRateNames = hasNonRefundableKeyword
                ? client_1.BookingPolicyType.NON_REFUNDABLE
                : hasFlexibleKeyword
                    ? client_1.BookingPolicyType.FLEXIBLE
                    : client_1.BookingPolicyType.FLEXIBLE;
            this.logger.logInfo('Policy derivation (from reservation rate names)', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                reservationPlanText,
                policyTypeFromReservationRateNames,
                matchedTriggers: {
                    nonRefundable: hasNonRefundableKeyword,
                    flexible: hasFlexibleKeyword,
                },
                defaultedToFlexible: !hasNonRefundableKeyword && !hasFlexibleKeyword,
                reasoning: hasNonRefundableKeyword
                    ? 'Rate name contains non-refundable keyword'
                    : hasFlexibleKeyword
                        ? 'Rate name contains flexible/refundable/standard rate keyword'
                        : 'No policy keyword found - defaulting to FLEXIBLE per business rule',
            });
            this.logger.logInfo('Policy derivation (final decision - using rate name)', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                policyType: policyTypeFromReservationRateNames,
                decisionSource: 'reservation-rate-name-deterministic',
                note: 'Policy derived from rooms[].detailedRoomRateNames only (v1.3 getReservationsWithRateDetails)',
            });
            const policyType = policyTypeFromReservationRateNames;
            const guestData = await this.cloudbedApi.getGuestByReservation(payload.reservationID, requestId);
            const guestEmail = String(guestData?.email ?? '');
            const specialRequests = String(guestData?.specialRequests ?? '');
            this.logger.logInfo('Guest data retrieved from Cloudbeds', 'BookingService', 'createBookingFromWebhook', requestId, {
                reservationID: payload.reservationID,
                guestID: guestData?.guestID,
                guestEmail,
                hasSpecialRequests: !!specialRequests,
                specialRequestsPreview: specialRequests.substring(0, 100),
            });
            let parsedCancellationDeadline = null;
            if (specialRequests) {
                const cancelMatch = specialRequests.match(/cancelled until:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})/i);
                if (cancelMatch) {
                    parsedCancellationDeadline = (0, date_fns_1.parseISO)(cancelMatch[1]);
                    this.logger.logInfo('Parsed cancellation deadline from special requests', 'BookingService', 'createBookingFromWebhook', requestId, {
                        reservationID: payload.reservationID,
                        rawSpecialRequests: specialRequests,
                        parsedCancellationDeadline,
                    });
                }
            }
            let cancellationDeadline = parsedCancellationDeadline;
            if (parsedCancellationDeadline) {
                this.logger.logInfo('Using cancellation deadline parsed from special requests (overrides config)', 'BookingService', 'createBookingFromWebhook', requestId, {
                    reservationID: payload.reservationID,
                    parsedCancellationDeadline,
                    reason: 'Cloudbeds guest special requests provided explicit deadline',
                });
            }
            if (!cancellationDeadline && policyType === client_1.BookingPolicyType.FLEXIBLE) {
                const propertyId = payload.propertyID_str || String(payload.propertyID);
                const policy = await this.cancellationPolicyService.getCancellationPolicy(propertyId, requestId);
                const daysBeforeCheckin = policy.daysBeforeCheckin;
                cancellationDeadline = new Date(startDate);
                cancellationDeadline.setDate(cancellationDeadline.getDate() - daysBeforeCheckin);
                this.logger.logInfo('Calculated config-based cancellation deadline for flexible booking', 'BookingService', 'createBookingFromWebhook', requestId, {
                    reservationID: payload.reservationID,
                    propertyId,
                    daysBeforeCheckin,
                    startDate,
                    cancellationDeadline,
                    parsedCancellationDeadline,
                    usedParsedDeadline: false,
                    reason: 'Parsed deadline not available – fallback to DB config',
                });
            }
            const persistedReservationId = String(payload.reservationID);
            const existingBooking = await this.prisma.booking.findUnique({
                where: { reservationId: persistedReservationId },
            });
            if (existingBooking) {
                this.logger.logInfo('Skipping booking creation (booking already exists for reservationId)', 'BookingService', 'createBookingFromWebhook', requestId, {
                    reservationID: payload.reservationID,
                    bookingId: existingBooking.id,
                    reservationId: existingBooking.reservationId,
                });
                return;
            }
            const booking = await this.prisma.booking.create({
                data: {
                    reservationId: persistedReservationId,
                    propertyId: payload.propertyID_str,
                    propertyName: String(rateDetailsObj?.propertyName ?? ''),
                    propertyAddress: String(rateDetailsObj?.propertyAddress ?? ''),
                    startDate,
                    endDate,
                    policyType,
                    status: client_1.BookingStatus.CREATED,
                    numberOfGuests: Number(rooms[0]?.adults ?? 1),
                    guestEmail,
                    specialRequests,
                    parsedCancellationDeadline,
                    totalAmount,
                    paidAmount,
                    remainingBalance,
                    currency,
                    roomId: payload.subReservations?.[0]?.roomId,
                    subReservations: payload.subReservations,
                    rawPayload: payload,
                    isSameDayCheckIn: isSameDay,
                    cancellationDeadline,
                },
            });
            this.logger.logInfo('Successfully created booking', 'BookingService', 'createBookingFromWebhook', requestId, { bookingId: booking.id, policyType });
            await this.createAuditLog(booking.id, 'Booking created from webhook', requestId, {
                payload,
                booking,
                policyDerivedFrom: {
                    source: 'reservation-rate-name',
                    reservationDetailedRoomRateNames,
                    policyType,
                },
            });
            await this.triggerPaymentWorkflow(booking, requestId);
        }
        catch (error) {
            this.logger.logError('Failed to create booking from webhook', 'BookingService', 'createBookingFromWebhook', error, requestId, { reservationID: payload.reservationID });
            throw error;
        }
    }
    resolveReservationDates(payload, reservationDetails) {
        const selectDate = (candidates, fallback, fallbackSource) => {
            for (const candidate of candidates) {
                if (candidate.value) {
                    return { date: (0, date_fns_1.parseISO)(String(candidate.value)), source: candidate.source };
                }
            }
            return { date: (0, date_fns_1.parseISO)(String(fallback)), source: fallbackSource };
        };
        const startCandidate = selectDate([
            { value: reservationDetails?.startDate, source: 'reservationDetails.startDate' },
            {
                value: reservationDetails?.assigned?.[0]?.startDate,
                source: 'reservationDetails.assigned[0].startDate',
            },
        ], payload.startDate, 'payload.startDate');
        const endCandidate = selectDate([
            { value: reservationDetails?.endDate, source: 'reservationDetails.endDate' },
            {
                value: reservationDetails?.assigned?.[0]?.endDate,
                source: 'reservationDetails.assigned[0].endDate',
            },
        ], payload.endDate, 'payload.endDate');
        return {
            startDate: startCandidate.date,
            endDate: endCandidate.date,
            selectedDateSources: {
                startDateSource: startCandidate.source,
                endDateSource: endCandidate.source,
            },
        };
    }
    async triggerPaymentWorkflow(booking, requestId) {
        this.logger.logInfo('Triggering payment workflow', 'BookingService', 'triggerPaymentWorkflow', requestId, { bookingId: booking.id, policyType: booking.policyType });
        await this.riskService.assessBookingRisk(booking.id, requestId);
        if (booking.policyType === client_1.BookingPolicyType.NON_REFUNDABLE) {
            this.logger.logInfo("Non-refundable policy detected, charging immediately", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
            await this.paymentService.processPayment(booking.id, requestId);
        }
        else if (booking.policyType === client_1.BookingPolicyType.FLEXIBLE) {
            this.logger.logInfo("Flexible policy detected, checking cancellation deadline", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
            if (booking.cancellationDeadline) {
                const now = new Date();
                const hoursUntilDeadline = (0, date_fns_1.differenceInHours)(booking.cancellationDeadline, now);
                this.logger.logInfo("checking cancellation deadline", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, hoursUntilDeadline });
                if (hoursUntilDeadline <= 0) {
                    this.logger.logInfo("Deadline passed, charge immediately", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, hoursUntilDeadline });
                    await this.paymentService.processPayment(booking.id, requestId);
                }
            }
        }
        else if (booking.isSameDayCheckIn) {
            this.logger.logInfo("Same-day check-in: Require payment within 1 hour", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id });
            await this.paymentService.processPayment(booking.id, requestId);
        }
        else {
            this.logger.logInfo("No action required", "BookingService", "triggerPaymentWorkflow", requestId, { bookingId: booking.id, booking });
        }
    }
    async updateBookingStatus(reservationId, status, requestId) {
        this.logger.logInfo('Updating booking status', 'BookingService', 'updateBookingStatus', requestId, { reservationId, status });
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { reservationId },
            });
            if (!booking) {
                this.logger.logWarn('Booking not found for status update', 'BookingService', 'updateBookingStatus', requestId, { reservationId });
                return;
            }
            const bookingStatus = this.mapStatus(status);
            await this.prisma.booking.update({
                where: { id: booking.id },
                data: { status: bookingStatus },
            });
            await this.createAuditLog(booking.id, `Booking status changed to ${status}`, requestId, { status, bookingStatus });
            const remainingBalance = booking.remainingBalance.toNumber();
            if (status === 'checked_in' && remainingBalance > 0) {
                this.logger.logInfo('Guest checking in with outstanding balance, processing payment', 'BookingService', 'updateBookingStatus', requestId, { bookingId: booking.id, remainingBalance });
                await this.paymentService.processPayment(booking.id, requestId);
            }
            this.logger.logInfo('Successfully updated booking status', 'BookingService', 'updateBookingStatus', requestId, { bookingId: booking.id, status: bookingStatus });
        }
        catch (error) {
            this.logger.logError('Failed to update booking status', 'BookingService', 'updateBookingStatus', error, requestId, { reservationId, status });
            throw error;
        }
    }
    mapStatus(status) {
        const statusMap = {
            confirmed: client_1.BookingStatus.CONFIRMED,
            checked_in: client_1.BookingStatus.CHECKED_IN,
            checked_out: client_1.BookingStatus.CHECKED_OUT,
            canceled: client_1.BookingStatus.CANCELLED,
            no_show: client_1.BookingStatus.NO_SHOW,
        };
        return statusMap[status] || client_1.BookingStatus.CONFIRMED;
    }
    async updateRoomAssignment(reservationId, roomId, requestId) {
        this.logger.logInfo('Updating room assignment', 'BookingService', 'updateRoomAssignment', requestId, { reservationId, roomId });
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { reservationId },
            });
            if (!booking) {
                this.logger.logWarn('Booking not found for room update', 'BookingService', 'updateRoomAssignment', requestId, { reservationId });
                return;
            }
            await this.prisma.booking.update({
                where: { id: booking.id },
                data: { roomId },
            });
            await this.createAuditLog(booking.id, 'Room assignment updated', requestId, { roomId });
        }
        catch (error) {
            this.logger.logError('Failed to update room assignment', 'BookingService', 'updateRoomAssignment', error, requestId);
        }
    }
    async createAuditLog(bookingId, message, requestId, data) {
        try {
            await this.prisma.auditLog.create({
                data: {
                    requestId,
                    bookingId,
                    module: 'BookingService',
                    function: 'createAuditLog',
                    message,
                    level: 'info',
                    inputData: data,
                },
            });
        }
        catch (error) {
            this.logger.logError('Failed to create audit log', 'BookingService', 'createAuditLog', error, requestId);
        }
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cloudbed_api_service_1.CloudbedApiService,
        payment_service_1.PaymentService,
        risk_assessment_service_1.RiskAssessmentService,
        cancellation_policy_service_1.CancellationPolicyService])
], BookingService);
//# sourceMappingURL=booking.service.js.map