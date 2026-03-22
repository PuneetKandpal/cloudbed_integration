export declare class LoggerService {
    private context;
    constructor(context?: string);
    generateRequestId(): string;
    logInfo(message: string, module: string, functionName: string, requestId?: string, inputData?: any, outputData?: any): void;
    logWarn(message: string, module: string, functionName: string, requestId?: string, inputData?: any, outputData?: any): void;
    logError(message: string, module: string, functionName: string, error: any, requestId?: string, inputData?: any, outputData?: any): void;
    private log;
}
