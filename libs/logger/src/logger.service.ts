import {
  Injectable,
  LoggerService as NestLoggerService,
  Inject,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class AppLogger implements NestLoggerService {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  // ✅ backward compatibility
  setContext(context: string) {
    this.context = context;
  }

  // ✅ support BOTH styles
  log(message: string | any, correlationId?: string) {
    if (typeof message === 'string') {
      this.logger.info(message, {
        context: this.context,
        correlationId,
      });
    } else {
      const { level = 'info', message: msg, ...meta } = message;
      this.logger.log(level, msg, {
        context: this.context,
        ...meta,
      });
    }
  }

  error(message: string | any, trace?: string) {
    this.logger.error(
      typeof message === 'string' ? message : message.message,
      {
        context: this.context,
        trace,
      },
    );
  }

  warn(message: string | any) {
    this.logger.warn(
      typeof message === 'string' ? message : message.message,
      { context: this.context },
    );
  }

  debug(message: string | any) {
    this.logger.debug(
      typeof message === 'string' ? message : message.message,
      { context: this.context },
    );
  }

  verbose(message: string | any) {
    this.logger.verbose(
      typeof message === 'string' ? message : message.message,
      { context: this.context },
    );
  }
}
