import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { v4 as uuidv4 } from 'uuid';

/**
 * Custom Winston Logger Service
 * Provides comprehensive logging with request tracking, automatic rotation, and 15-day retention
 *
 * Features:
 * - Request ID tracking for correlation
 * - Module/Function context tracking
 * - Input/Output data logging
 * - Daily log rotation with 15-day retention
 * - Structured JSON logging for production
 * - Console logging for development
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private context: string;

  constructor(context?: string) {
    this.context = context || 'Application';
    this.logger = this.createLogger();
  }

  /**
   * Create Winston logger instance with daily rotation
   */
  private createLogger(): winston.Logger {
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(
        ({ timestamp, level, message, context, requestId, ...meta }) => {
          const metaStr = Object.keys(meta).length
            ? JSON.stringify(meta, null, 2)
            : '';
          const reqId = requestId ? `[${requestId}]` : '';
          return `${timestamp} ${level} [${context || this.context}] ${reqId}: ${message} ${metaStr}`;
        },
      ),
    );

    // Daily rotate file transport for all logs
    const dailyRotateTransport = new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '15d', // 15 days retention
      format: logFormat,
      level: process.env.LOG_LEVEL || 'info',
    });

    // Daily rotate file transport for errors only
    const errorRotateTransport = new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: process.env.LOG_MAX_SIZE || '20m',
      maxFiles: process.env.LOG_MAX_FILES || '15d', // 15 days retention
      format: logFormat,
      level: 'error',
    });

    return winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports: [
        dailyRotateTransport,
        errorRotateTransport,
        // Console transport for development
        new winston.transports.Console({
          format: consoleFormat,
        }),
      ],
    });
  }

  /**
   * Set context for logger instance
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId(): string {
    return uuidv4();
  }

  /**
   * Log with detailed context
   */
  logWithContext(
    level: string,
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    inputData?: any,
    outputData?: any,
    error?: any,
  ): void {
    const logEntry = {
      level,
      message,
      context: this.context,
      module,
      function: functionName,
      requestId: requestId || this.generateRequestId(),
      timestamp: new Date().toISOString(),
      inputData: inputData ? this.sanitizeData(inputData) : undefined,
      outputData: outputData ? this.sanitizeData(outputData) : undefined,
      error: error ? this.formatError(error) : undefined,
    };

    this.logger.log(level, message, logEntry);
  }

  /**
   * Sanitize sensitive data before logging
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sensitiveFields = [
      'password',
      'apiKey',
      'token',
      'secret',
      'cardNumber',
      'cvv',
    ];
    const sanitized = JSON.parse(JSON.stringify(data));

    const sanitizeObject = (obj: any) => {
      for (const key in obj) {
        if (
          sensitiveFields.some((field) => key.toLowerCase().includes(field))
        ) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Format error for logging
   */
  private formatError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }
    return error;
  }

  /**
   * Standard NestJS logger interface methods
   */
  log(message: string, context?: string): void {
    this.logger.info(message, { context: context || this.context });
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { context: context || this.context, trace });
  }

  warn(message: string, context?: string): void {
    this.logger.warn(message, { context: context || this.context });
  }

  debug(message: string, context?: string): void {
    this.logger.debug(message, { context: context || this.context });
  }

  verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context: context || this.context });
  }

  /**
   * Enhanced logging methods with full context
   */
  logInfo(
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    inputData?: any,
    outputData?: any,
  ): void {
    this.logWithContext(
      'info',
      message,
      module,
      functionName,
      requestId,
      inputData,
      outputData,
    );
  }

  logError(
    message: string,
    module: string,
    functionName: string,
    error: any,
    requestId?: string,
    inputData?: any,
  ): void {
    this.logWithContext(
      'error',
      message,
      module,
      functionName,
      requestId,
      inputData,
      undefined,
      error,
    );
  }

  logDebug(
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    data?: any,
  ): void {
    this.logWithContext(
      'debug',
      message,
      module,
      functionName,
      requestId,
      data,
    );
  }

  logWarn(
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    data?: any,
  ): void {
    this.logWithContext('warn', message, module, functionName, requestId, data);
  }
}
