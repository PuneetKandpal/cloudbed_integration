import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts correlationId from request (set by CorrelationInterceptor).
 * Uses a minimal type so this lib stays adapter-agnostic (no Express dependency).
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ correlationId?: string }>();
    return request.correlationId;
  },
);
