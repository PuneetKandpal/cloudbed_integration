import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoggerService } from '../common/logger/logger.service';
import { RiskLevel } from '@prisma/client';
import { differenceInHours } from 'date-fns';
import { ConfigService } from '@nestjs/config';

/**
 * Risk Assessment Service
 * Evaluates booking risk based on multiple factors
 */
@Injectable()
export class RiskAssessmentService {
  private readonly logger = new LoggerService('RiskAssessmentService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Assess booking risk
   * Evaluates multiple risk factors and assigns risk level
   */
  async assessBookingRisk(bookingId: string, requestId: string): Promise<void> {
    this.logger.logInfo(
      'Assessing booking risk',
      'RiskAssessmentService',
      'assessBookingRisk',
      requestId,
      { bookingId },
    );

    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      this.logger.logInfo(
        'Loaded booking for risk assessment',
        'RiskAssessmentService',
        'assessBookingRisk',
        requestId,
        {
          bookingId,
          reservationId: booking.reservationId,
          totalAmountRaw: booking.totalAmount.toString(),
          remainingBalanceRaw: booking.remainingBalance.toString(),
          startDate: booking.startDate,
          numberOfGuests: booking.numberOfGuests,
        },
      );

      const totalAmount = booking.totalAmount.toNumber();
      const remainingBalance = booking.remainingBalance.toNumber();

      const now = new Date();
      const hoursUntilCheckIn = differenceInHours(booking.startDate, now);

      const roomCount = Array.isArray(booking.subReservations)
        ? booking.subReservations.length
        : 1;

      const isSameDayCheckIn = hoursUntilCheckIn <= 24;
      const isNextDayCheckIn =
        hoursUntilCheckIn > 24 && hoursUntilCheckIn <= 48;

      const roomThresholdRaw =
        this.config.get('HIGH_RISK_ROOM_THRESHOLD') ??
        '2';

      const hasMultipleRooms = roomCount > parseInt(roomThresholdRaw);

      this.logger.logInfo(
        'Risk factors calculated',
        'RiskAssessmentService',
        'assessBookingRisk',
        requestId,
        {
          bookingId,
          hoursUntilCheckIn,
          isSameDayCheckIn,
          isNextDayCheckIn,
          roomCount,
          roomThreshold: parseInt(roomThresholdRaw),
          hasMultipleRooms: hasMultipleRooms,
          totalAmount,
          remainingBalance,
        },
      );

      let riskScore = 0;
      let riskLevel: RiskLevel = RiskLevel.LOW;

      if (isSameDayCheckIn) {
        riskScore += 50;
        this.logger.logInfo(
          'Applied same-day check-in risk score',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, increment: 50, riskScore },
        );
      } else if (isNextDayCheckIn) {
        riskScore += 30;
        this.logger.logInfo(
          'Applied next-day check-in risk score',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, increment: 30, riskScore },
        );
      }

      if (hasMultipleRooms) {
        riskScore += 20;
        this.logger.logInfo(
          'Applied multiple room risk score',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, increment: 20, riskScore },
        );
      }

      if (totalAmount > 500) {
        riskScore += 10;
        this.logger.logInfo(
          'Applied high value booking risk score',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, increment: 10, riskScore },
        );
      }

      if (riskScore >= 70) {
        riskLevel = RiskLevel.CRITICAL;
        this.logger.logInfo(
          'Risk level classified as CRITICAL',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, riskScore },
        );
      } else if (riskScore >= 50) {
        riskLevel = RiskLevel.HIGH;
        this.logger.logInfo(
          'Risk level classified as HIGH',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, riskScore },
        );
      } else if (riskScore >= 30) {
        riskLevel = RiskLevel.MEDIUM;
        this.logger.logInfo(
          'Risk level classified as MEDIUM',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, riskScore },
        );
      } else {
        this.logger.logInfo(
          'Risk level remains LOW',
          'RiskAssessmentService',
          'assessBookingRisk',
          requestId,
          { bookingId, riskScore },
        );
      }

      const requiresImmediatePayment =
        isSameDayCheckIn || riskLevel === RiskLevel.CRITICAL;
      const priorityForCancellation =
        (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) &&
        remainingBalance > 0;

      this.logger.logInfo(
        'Derived operational actions from risk assessment',
        'RiskAssessmentService',
        'assessBookingRisk',
        requestId,
        {
          bookingId,
          requiresImmediatePayment,
          priorityForCancellation,
          remainingBalance,
        },
      );

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

      this.logger.logInfo(
        'Successfully assessed booking risk',
        'RiskAssessmentService',
        'assessBookingRisk',
        requestId,
        { bookingId, riskLevel, riskScore },
      );
    } catch (error) {
      this.logger.logError(
        'Failed to assess booking risk',
        'RiskAssessmentService',
        'assessBookingRisk',
        error,
        requestId,
        { bookingId },
      );
      throw error;
    }
  }
}
