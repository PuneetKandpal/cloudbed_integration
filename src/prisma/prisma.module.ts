import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Prisma Module (Global)
 * Makes Prisma service available throughout the application
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
