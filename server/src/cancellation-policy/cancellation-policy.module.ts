import { Module } from '@nestjs/common';
import { CancellationPolicyService } from './cancellation-policy.service';
import { CancellationPolicyController } from './cancellation-policy.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CancellationPolicyController],
  providers: [CancellationPolicyService],
  exports: [CancellationPolicyService],
})
export class CancellationPolicyModule {}
