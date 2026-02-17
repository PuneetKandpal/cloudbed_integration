import { Module } from '@nestjs/common';
import { RiskAssessmentService } from './risk-assessment.service';

@Module({
  providers: [RiskAssessmentService],
  exports: [RiskAssessmentService],
})
export class RiskModule {}
