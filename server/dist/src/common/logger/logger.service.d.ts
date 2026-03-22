import { LoggerService as NestLoggerService } from '@nestjs/common';
export declare class LoggerService implements NestLoggerService {
    private logger;
    private context;
    constructor(context?: string);
    private createLogger;
    setContext(context: string): void;
    generateRequestId(): string;
    logWithContext(level: string, message: string, module: string, functionName: string, requestId?: string, inputData?: any, outputData?: any, error?: any): void;
    private sanitizeData;
    private formatError;
    log(message: string, context?: string): void;
    error(message: string, trace?: string, context?: string): void;
    warn(message: string, context?: string): void;
    debug(message: string, context?: string): void;
    verbose(message: string, context?: string): void;
    logInfo(message: string, module: string, functionName: string, requestId?: string, inputData?: any, outputData?: any): void;
    logError(message: string, module: string, functionName: string, error: any, requestId?: string, inputData?: any): void;
    logDebug(message: string, module: string, functionName: string, requestId?: string, data?: any): void;
    logWarn(message: string, module: string, functionName: string, requestId?: string, data?: any): void;
}
