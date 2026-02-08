import {
  Injectable,
  LoggerService as NestLoggerService,
  Inject,
} from '@nestjs/common';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, correlationId?: string) {
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

  error(message: any, trace?: string) {
    this.logger.error(
      typeof message === 'string' ? message : message?.message,
      {
        context: this.context,
        trace,
      },
    );
  }

  warn(message: any) {
    this.logger.warn(
      typeof message === 'string' ? message : message?.message,
      { context: this.context },
    );
  }

  debug(message: any) {
    this.logger.debug(
      typeof message === 'string' ? message : message?.message,
      { context: this.context },
    );
  }

  verbose(message: any) {
    this.logger.verbose(
      typeof message === 'string' ? message : message?.message,
      { context: this.context },
    );
  }
}
