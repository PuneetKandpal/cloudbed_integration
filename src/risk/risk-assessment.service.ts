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

      const now = new Date();
      const hoursUntilCheckIn = differenceInHours(booking.startDate, now);

      const isSameDayCheckIn = hoursUntilCheckIn <= 24;
      const isNextDayCheckIn = hoursUntilCheckIn > 24 && hoursUntilCheckIn <= 48;
      const hasMultipleGuests = booking.numberOfGuests > parseInt(this.config.get('HIGH_RISK_GUEST_THRESHOLD') || '4');

      let riskScore = 0;
      let riskLevel = RiskLevel.LOW;

      if (isSameDayCheckIn) {
        riskScore += 50;
      } else if (isNextDayCheckIn) {
        riskScore += 30;
      }

      if (hasMultipleGuests) {
        riskScore += 20;
      }

      if (booking.totalAmount > 500) {
        riskScore += 10;
      }

      if (riskScore >= 70) {
        riskLevel = RiskLevel.CRITICAL;
      } else if (riskScore >= 50) {
        riskLevel = RiskLevel.HIGH;
      } else if (riskScore >= 30) {
        riskLevel = RiskLevel.MEDIUM;
      }

      const requiresImmediatePayment = isSameDayCheckIn || riskLevel === RiskLevel.CRITICAL;
      const priorityForCancellation = (riskLevel === RiskLevel.HIGH || riskLevel === RiskLevel.CRITICAL) && booking.remainingBalance > 0;

      await this.prisma.riskAssessment.create({
        data: {
          bookingId,
          riskLevel,
          riskScore,
          isSameDayCheckIn,
          isNextDayCheckIn,
          hoursUntilCheckIn,
          hasMultipleGuests,
          requiresImmediatePayment,
          priorityForCancellation,
          assessmentData: {
            factors: {
              sameDayCheckIn: isSameDayCheckIn,
              nextDayCheckIn: isNextDayCheckIn,
              multipleGuests: hasMultipleGuests,
              highValue: booking.totalAmount > 500,
            },
            scores: {
              timingScore: isSameDayCheckIn ? 50 : isNextDayCheckIn ? 30 : 0,
              guestScore: hasMultipleGuests ? 20 : 0,
              valueScore: booking.totalAmount > 500 ? 10 : 0,
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
