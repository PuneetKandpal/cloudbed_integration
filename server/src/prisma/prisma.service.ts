import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../common/logger/logger.service';

/**
 * Prisma Service
 * Manages database connection and provides Prisma client instance
 * Handles graceful connection/disconnection
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new LoggerService('PrismaService');

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  /**
   * Initialize Prisma connection on module initialization
   */
  async onModuleInit() {
    const requestId = this.logger.generateRequestId();
    this.logger.logInfo(
      'Connecting to database...',
      'PrismaService',
      'onModuleInit',
      requestId,
    );

    try {
      await this.$connect();
      this.logger.logInfo(
        'Successfully connected to database',
        'PrismaService',
        'onModuleInit',
        requestId,
      );
    } catch (error) {
      this.logger.logError(
        'Failed to connect to database',
        'PrismaService',
        'onModuleInit',
        error,
        requestId,
      );
      throw error;
    }
  }

  /**
   * Gracefully disconnect from database on module destruction
   */
  async onModuleDestroy() {
    const requestId = this.logger.generateRequestId();
    this.logger.logInfo(
      'Disconnecting from database...',
      'PrismaService',
      'onModuleDestroy',
      requestId,
    );

    await this.$disconnect();

    this.logger.logInfo(
      'Successfully disconnected from database',
      'PrismaService',
      'onModuleDestroy',
      requestId,
    );
  }
}
