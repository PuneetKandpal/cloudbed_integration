import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class WebhookGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
