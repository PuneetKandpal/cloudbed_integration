"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
const common_1 = require("@nestjs/common");
const winston = __importStar(require("winston"));
const winston_daily_rotate_file_1 = __importDefault(require("winston-daily-rotate-file"));
const uuid_1 = require("uuid");
let LoggerService = class LoggerService {
    logger;
    context;
    constructor(context) {
        this.context = context || 'Application';
        this.logger = this.createLogger();
    }
    createLogger() {
        const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.errors({ stack: true }), winston.format.splat(), winston.format.json());
        const consoleFormat = winston.format.combine(winston.format.colorize(), winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), winston.format.printf(({ timestamp, level, message, context, requestId, ...meta }) => {
            const metaStr = Object.keys(meta).length
                ? JSON.stringify(meta, null, 2)
                : '';
            const reqId = requestId ? `[${requestId}]` : '';
            return `${timestamp} ${level} [${context || this.context}] ${reqId}: ${message} ${metaStr}`;
        }));
        const dailyRotateTransport = new winston_daily_rotate_file_1.default({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '15d',
            format: logFormat,
            level: process.env.LOG_LEVEL || 'info',
        });
        const errorRotateTransport = new winston_daily_rotate_file_1.default({
            filename: 'logs/error-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: process.env.LOG_MAX_SIZE || '20m',
            maxFiles: process.env.LOG_MAX_FILES || '15d',
            format: logFormat,
            level: 'error',
        });
        return winston.createLogger({
            level: process.env.LOG_LEVEL || 'info',
            format: logFormat,
            transports: [
                dailyRotateTransport,
                errorRotateTransport,
                new winston.transports.Console({
                    format: consoleFormat,
                }),
            ],
        });
    }
    setContext(context) {
        this.context = context;
    }
    generateRequestId() {
        return (0, uuid_1.v4)();
    }
    logWithContext(level, message, module, functionName, requestId, inputData, outputData, error) {
        const logEntry = {
            level,
            message,
            context: this.context,
            module,
            function: functionName,
            requestId: requestId || this.generateRequestId(),
            timestamp: new Date().toISOString(),
            inputData: inputData ? this.sanitizeData(inputData) : undefined,
            outputData: outputData ? this.sanitizeData(outputData) : undefined,
            error: error ? this.formatError(error) : undefined,
        };
        this.logger.log(level, message, logEntry);
    }
    sanitizeData(data) {
        if (!data)
            return data;
        const sensitiveFields = [
            'password',
            'apiKey',
            'token',
            'secret',
            'cardNumber',
            'cvv',
        ];
        const sanitized = JSON.parse(JSON.stringify(data));
        const sanitizeObject = (obj) => {
            for (const key in obj) {
                if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
                    obj[key] = '***REDACTED***';
                }
                else if (typeof obj[key] === 'object' && obj[key] !== null) {
                    sanitizeObject(obj[key]);
                }
            }
        };
        sanitizeObject(sanitized);
        return sanitized;
    }
    formatError(error) {
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        return error;
    }
    log(message, context) {
        this.logger.info(message, { context: context || this.context });
    }
    error(message, trace, context) {
        this.logger.error(message, { context: context || this.context, trace });
    }
    warn(message, context) {
        this.logger.warn(message, { context: context || this.context });
    }
    debug(message, context) {
        this.logger.debug(message, { context: context || this.context });
    }
    verbose(message, context) {
        this.logger.verbose(message, { context: context || this.context });
    }
    logInfo(message, module, functionName, requestId, inputData, outputData) {
        this.logWithContext('info', message, module, functionName, requestId, inputData, outputData);
    }
    logError(message, module, functionName, error, requestId, inputData) {
        this.logWithContext('error', message, module, functionName, requestId, inputData, undefined, error);
    }
    logDebug(message, module, functionName, requestId, data) {
        this.logWithContext('debug', message, module, functionName, requestId, data);
    }
    logWarn(message, module, functionName, requestId, data) {
        this.logWithContext('warn', message, module, functionName, requestId, data);
    }
};
exports.LoggerService = LoggerService;
exports.LoggerService = LoggerService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [String])
], LoggerService);
//# sourceMappingURL=logger.service.js.map