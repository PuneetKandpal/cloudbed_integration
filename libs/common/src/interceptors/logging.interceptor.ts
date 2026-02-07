import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AppLogger } from '../../../logger/src/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Only log HTTP requests
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    if (!request) {
      return next.handle();
    }

    const correlationId =
      request.headers?.['x-correlation-id'] ??
      request.correlationId ??
      'N/A';

    const method = request.method;
    const url = request.url;
    const startTime = Date.now();

    this.logger.log({
      level: 'info',
      message: `Incoming request ${method} ${url}`,
      context: LoggingInterceptor.name,
      requestId: correlationId,
      metadata: {},
    });

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;

        this.logger.log({
          level: 'info',
          message: `Completed request ${method} ${url}`,
          context: LoggingInterceptor.name,
          requestId: correlationId,
          metadata: { durationMs: duration },
        });
      }),
    );
  }
}
