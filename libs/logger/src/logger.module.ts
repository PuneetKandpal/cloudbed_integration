import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

import { AppLogger } from './logger.service';

@Global() // 🔥 makes logger available everywhere
@Module({
  imports: [
    WinstonModule.forRoot({
      transports: [
        // Console (dev)
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.colorize(),
            winston.format.printf(
              ({ timestamp, level, message, context, requestId, serviceName, metadata }) => {
                let msg = `${timestamp} [${level}]`;
                if (serviceName) msg += ` [${serviceName}]`;
                if (context) msg += ` [${context}]`;
                if (requestId) msg += ` [${requestId}]`;
                msg += ` ${message}`;
                if (metadata && Object.keys(metadata).length > 0) {
                  msg += ` ${JSON.stringify(metadata)}`;
                }
                return msg;
              },
            ),
          ),
        }),

        // Application logs
        new DailyRotateFile({
          filename: 'logs/application-%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxSize: '30m',
          maxFiles: '14d',
          format: winston.format.json(),
        }),

        // Error logs
        new DailyRotateFile({
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
  providers: [AppLogger],
  exports: [AppLogger],
})
export class LoggerModule {}

export { AppLogger };

