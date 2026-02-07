"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppLogger = exports.LoggerModule = void 0;
const common_1 = require("@nestjs/common");
const nest_winston_1 = require("nest-winston");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const logger_service_1 = require("./logger.service");
Object.defineProperty(exports, "AppLogger", { enumerable: true, get: function () { return logger_service_1.AppLogger; } });
let LoggerModule = class LoggerModule {
};
exports.LoggerModule = LoggerModule;
exports.LoggerModule = LoggerModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            nest_winston_1.WinstonModule.forRoot({
                transports: [
                    new winston.transports.Console({
                        format: winston.format.combine(winston.format.timestamp(), winston.format.colorize(), winston.format.printf(({ timestamp, level, message, context, requestId, serviceName, metadata }) => {
                            let msg = `${timestamp} [${level}]`;
                            if (serviceName)
                                msg += ` [${serviceName}]`;
                            if (context)
                                msg += ` [${context}]`;
                            if (requestId)
                                msg += ` [${requestId}]`;
                            msg += ` ${message}`;
                            if (metadata && Object.keys(metadata).length > 0) {
                                msg += ` ${JSON.stringify(metadata)}`;
                            }
                            return msg;
                        })),
                    }),
                    new DailyRotateFile({
                        filename: 'logs/application-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        maxSize: '30m',
                        maxFiles: '14d',
                        format: winston.format.json(),
                    }),
                    new DailyRotateFile({
                        filename: 'logs/error-%DATE%.log',
                        datePattern: 'YYYY-MM-DD',
                        level: 'error',
                        maxSize: '30m',
                        maxFiles: '14d',
                        format: winston.format.json(),
                    }),
                ],
            }),
        ],
        providers: [logger_service_1.AppLogger],
        exports: [logger_service_1.AppLogger],
    })
], LoggerModule);
//# sourceMappingURL=logger.module.js.map