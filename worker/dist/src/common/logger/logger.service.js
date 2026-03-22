"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoggerService = void 0;
class LoggerService {
    context;
    constructor(context) {
        this.context = context || 'Worker';
    }
    generateRequestId() {
        // Simple request id generator (no external deps)
        return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    }
    logInfo(message, module, functionName, requestId, inputData, outputData) {
        this.log('INFO', message, module, functionName, requestId, inputData, outputData);
    }
    logWarn(message, module, functionName, requestId, inputData, outputData) {
        this.log('WARN', message, module, functionName, requestId, inputData, outputData);
    }
    logError(message, module, functionName, error, requestId, inputData, outputData) {
        this.log('ERROR', message, module, functionName, requestId, inputData, outputData, error);
    }
    log(level, message, module, functionName, requestId, inputData, outputData, error) {
        const ts = new Date().toISOString();
        const rid = requestId ? ` [${requestId}]` : '';
        const meta = {
            context: this.context,
            module,
            function: functionName,
        };
        if (inputData !== undefined)
            meta.inputData = inputData;
        if (outputData !== undefined)
            meta.outputData = outputData;
        if (level === 'ERROR') {
            console.error(`[${level}] ${ts} [${this.context}]${rid} ${message}`, meta, error);
            return;
        }
        if (level === 'WARN') {
            console.warn(`[${level}] ${ts} [${this.context}]${rid} ${message}`, meta);
            return;
        }
        console.log(`[${level}] ${ts} [${this.context}]${rid} ${message}`, meta);
    }
}
exports.LoggerService = LoggerService;
//# sourceMappingURL=logger.service.js.map