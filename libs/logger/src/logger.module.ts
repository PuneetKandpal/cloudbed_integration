import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { LoggerService } from './logger.service';

@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context }) => {
                return `${timestamp} [${level}] [${context}] ${message}`;
              },
            ),
          ),
        }),

        new winston.transports.DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '30m',
          maxFiles: '14d',
          format: winston.format.json(),
        }),

        new winston.transports.DailyRotateFile({
          filename: 'logs/error-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          level: 'error',
          maxSize: '30m',
          maxFiles: '14d',
          format: winston.format.json(),
        }),
      ],
    }),
  ],
  providers: [LoggerService],   // ✅ use LoggerService
  exports: [LoggerService],     // ✅ export LoggerService
})
export class LoggerModule {}
