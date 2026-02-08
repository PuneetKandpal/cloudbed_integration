import { LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'winston';
export declare class LoggerService implements NestLoggerService {
    private readonly logger;
    private context?;
    constructor(logger: Logger);
    setContext(context: string): void;
    log(message: any, correlationId?: string): void;
    error(message: any, trace?: string): void;
    warn(message: any): void;
    debug(message: any): void;
    verbose(message: any): void;
}
