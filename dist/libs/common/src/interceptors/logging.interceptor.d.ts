import { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppLogger } from '../../../logger/src/logger.service';
export declare class LoggingInterceptor implements NestInterceptor {
    private readonly logger;
    constructor(logger: AppLogger);
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown>;
}
