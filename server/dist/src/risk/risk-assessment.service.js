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
exports.RiskAssessmentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const logger_service_1 = require("../common/logger/logger.service");
const client_1 = require("@prisma/client");
const date_fns_1 = require("date-fns");
const config_1 = require("@nestjs/config");
let RiskAssessmentService = class RiskAssessmentService {
    prisma;
    config;
    logger = new logger_service_1.LoggerService('RiskAssessmentService');
    constructor(prisma, config) {
        this.prisma = prisma;
        this.config = config;
    }
    async assessBookingRisk(bookingId, requestId) {
        this.logger.logInfo('Assessing booking risk', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId });
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });
            if (!booking) {
                throw new Error('Booking not found');
            }
            this.logger.logInfo('Loaded booking for risk assessment', 'RiskAssessmentService', 'assessBookingRisk', requestId, {
                bookingId,
                reservationId: booking.reservationId,
                totalAmountRaw: booking.totalAmount.toString(),
                remainingBalanceRaw: booking.remainingBalance.toString(),
                startDate: booking.startDate,
                numberOfGuests: booking.numberOfGuests,
            });
            const totalAmount = booking.totalAmount.toNumber();
            const remainingBalance = booking.remainingBalance.toNumber();
            const now = new Date();
            const hoursUntilCheckIn = (0, date_fns_1.differenceInHours)(booking.startDate, now);
            const roomCount = Array.isArray(booking.subReservations)
                ? booking.subReservations.length
                : 1;
            const isSameDayCheckIn = hoursUntilCheckIn <= 24;
            const isNextDayCheckIn = hoursUntilCheckIn > 24 && hoursUntilCheckIn <= 48;
            const roomThresholdRaw = this.config.get('HIGH_RISK_ROOM_THRESHOLD') ??
                '2';
            const hasMultipleRooms = roomCount > parseInt(roomThresholdRaw);
            this.logger.logInfo('Risk factors calculated', 'RiskAssessmentService', 'assessBookingRisk', requestId, {
                bookingId,
                hoursUntilCheckIn,
                isSameDayCheckIn,
                isNextDayCheckIn,
                roomCount,
                roomThreshold: parseInt(roomThresholdRaw),
                hasMultipleRooms: hasMultipleRooms,
                totalAmount,
                remainingBalance,
            });
            let riskScore = 0;
            let riskLevel = client_1.RiskLevel.LOW;
            if (isSameDayCheckIn) {
                riskScore += 50;
                this.logger.logInfo('Applied same-day check-in risk score', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, increment: 50, riskScore });
            }
            else if (isNextDayCheckIn) {
                riskScore += 30;
                this.logger.logInfo('Applied next-day check-in risk score', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, increment: 30, riskScore });
            }
            if (hasMultipleRooms) {
                riskScore += 20;
                this.logger.logInfo('Applied multiple room risk score', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, increment: 20, riskScore });
            }
            if (totalAmount > 500) {
                riskScore += 10;
                this.logger.logInfo('Applied high value booking risk score', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, increment: 10, riskScore });
            }
            if (riskScore >= 70) {
                riskLevel = client_1.RiskLevel.CRITICAL;
                this.logger.logInfo('Risk level classified as CRITICAL', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, riskScore });
            }
            else if (riskScore >= 50) {
                riskLevel = client_1.RiskLevel.HIGH;
                this.logger.logInfo('Risk level classified as HIGH', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, riskScore });
            }
            else if (riskScore >= 30) {
                riskLevel = client_1.RiskLevel.MEDIUM;
                this.logger.logInfo('Risk level classified as MEDIUM', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, riskScore });
            }
            else {
                this.logger.logInfo('Risk level remains LOW', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, riskScore });
            }
            const requiresImmediatePayment = isSameDayCheckIn || riskLevel === client_1.RiskLevel.CRITICAL;
            const priorityForCancellation = (riskLevel === client_1.RiskLevel.HIGH || riskLevel === client_1.RiskLevel.CRITICAL) &&
                remainingBalance > 0;
            this.logger.logInfo('Derived operational actions from risk assessment', 'RiskAssessmentService', 'assessBookingRisk', requestId, {
                bookingId,
                requiresImmediatePayment,
                priorityForCancellation,
                remainingBalance,
            });
            await this.prisma.riskAssessment.create({
                data: {
                    bookingId,
                    riskLevel,
                    riskScore,
                    isSameDayCheckIn,
                    isNextDayCheckIn,
                    hoursUntilCheckIn,
                    hasMultipleRooms,
                    requiresImmediatePayment,
                    priorityForCancellation,
                    assessmentData: {
                        factors: {
                            sameDayCheckIn: isSameDayCheckIn,
                            nextDayCheckIn: isNextDayCheckIn,
                            roomCount,
                            multipleRooms: hasMultipleRooms,
                            highValue: totalAmount > 500,
                        },
                        scores: {
                            timingScore: isSameDayCheckIn ? 50 : isNextDayCheckIn ? 30 : 0,
                            roomScore: hasMultipleRooms ? 20 : 0,
                            valueScore: totalAmount > 500 ? 10 : 0,
                            totalScore: riskScore,
                        },
                    },
                },
            });
            this.logger.logInfo('Successfully assessed booking risk', 'RiskAssessmentService', 'assessBookingRisk', requestId, { bookingId, riskLevel, riskScore });
        }
        catch (error) {
            this.logger.logError('Failed to assess booking risk', 'RiskAssessmentService', 'assessBookingRisk', error, requestId, { bookingId });
            throw error;
        }
    }
};
exports.RiskAssessmentService = RiskAssessmentService;
exports.RiskAssessmentService = RiskAssessmentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], RiskAssessmentService);
//# sourceMappingURL=risk-assessment.service.js.map