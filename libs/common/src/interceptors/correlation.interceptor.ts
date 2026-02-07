import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { HttpRequestLike } from '../types/http-request.interface';

/**
 * Attaches correlationId to request for tracing across services.
 * Reads X-Correlation-Id from headers or generates one.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    const correlationId =
      (request.headers['x-correlation-id'] as string) ??
      this.generateCorrelationId();
    request.correlationId = correlationId;
    return next.handle();
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
}
