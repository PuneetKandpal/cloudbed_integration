import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpRequestLike } from '../types/http-request.interface';

/**
 * Guard for validating Cloudbeds (or other) webhook requests.
 * TODO: Implement signature/secret validation for webhook payloads.
 */
@Injectable()
export class WebhookGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<HttpRequestLike>();
    // TODO: Validate webhook signature (e.g. X-Webhook-Signature, X-Cloudbeds-Signature)
    const signature = request.headers['x-webhook-signature'] ?? request.headers['x-cloudbeds-signature'];
    if (!signature) {
      throw new UnauthorizedException('Missing webhook signature');
    }
    // TODO: Verify signature against configured secret
    return true;
  }
}
