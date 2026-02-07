"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLogger = void 0;
const common_1 = require("@nestjs/common");
const winston_1 = require("winston");
const nest_winston_1 = require("nest-winston");
let AppLogger = class AppLogger {
    constructor(logger) {
        this.logger = logger;
    }
    setContext(context) {
        this.context = context;
    }
    log(message, correlationId) {
        if (typeof message === 'string') {
            this.logger.info(message, {
                context: this.context,
                correlationId,
            });
        }
        else {
            const { level = 'info', message: msg, ...meta } = message;
            this.logger.log(level, msg, {
                context: this.context,
                ...meta,
            });
        }
    }
    error(message, trace) {
        this.logger.error(typeof message === 'string' ? message : message.message, {
            context: this.context,
            trace,
        });
    }
    warn(message) {
        this.logger.warn(typeof message === 'string' ? message : message.message, { context: this.context });
    }
    debug(message) {
        this.logger.debug(typeof message === 'string' ? message : message.message, { context: this.context });
    }
    verbose(message) {
        this.logger.verbose(typeof message === 'string' ? message : message.message, { context: this.context });
    }
};
exports.AppLogger = AppLogger;
exports.AppLogger = AppLogger = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)(nest_winston_1.WINSTON_MODULE_PROVIDER)),
    __metadata("design:paramtypes", [winston_1.Logger])
], AppLogger);
//# sourceMappingURL=logger.service.js.map