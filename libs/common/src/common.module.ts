import { Global, Module } from '@nestjs/common';
import { AppLogger } from '../../logger/src/logger.module.js';

/**
 * Global module providing shared logger and utilities.
 * Import once in each app's AppModule to wire logger globally.
 */
@Global()
@Module({
  providers: [AppLogger],
  exports: [AppLogger],
})
export class CommonModule {}
