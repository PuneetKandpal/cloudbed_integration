import { LoggerService as NestLoggerService } from '@nestjs/common';
import { Logger } from 'winston';
export declare class AppLogger implements NestLoggerService {
    private readonly logger;
    private context?;
    constructor(logger: Logger);
    setContext(context: string): void;
    log(message: string | any, correlationId?: string): void;
    error(message: string | any, trace?: string): void;
    warn(message: string | any): void;
    debug(message: string | any): void;
    verbose(message: string | any): void;
}
