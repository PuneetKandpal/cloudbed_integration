import { Injectable } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private context = 'Service';

  setContext(context: string) {
    this.context = context;
  }

  log(message: string) {
    console.log(`[${this.context}] ${message}`);
  }

  error(message: string, error?: any) {
    console.error(`[${this.context}] ERROR: ${message}`, error);
  }

  warn(message: string) {
    console.warn(`[${this.context}] WARN: ${message}`);
  }

  debug(message: string) {
    console.debug(`[${this.context}] DEBUG: ${message}`);
  }
}
