export class LoggerService {
  private context: string;

  constructor(context?: string) {
    this.context = context || 'Worker';
  }

  generateRequestId(): string {
    // Simple request id generator (no external deps)
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  logInfo(
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    inputData?: any,
    outputData?: any,
  ): void {
    this.log('INFO', message, module, functionName, requestId, inputData, outputData);
  }

  logWarn(
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    inputData?: any,
    outputData?: any,
  ): void {
    this.log('WARN', message, module, functionName, requestId, inputData, outputData);
  }

  logError(
    message: string,
    module: string,
    functionName: string,
    error: any,
    requestId?: string,
    inputData?: any,
    outputData?: any,
  ): void {
    this.log('ERROR', message, module, functionName, requestId, inputData, outputData, error);
  }

  private log(
    level: 'INFO' | 'WARN' | 'ERROR',
    message: string,
    module: string,
    functionName: string,
    requestId?: string,
    inputData?: any,
    outputData?: any,
    error?: any,
  ): void {
    const ts = new Date().toISOString();
    const rid = requestId ? ` [${requestId}]` : '';

    const meta: Record<string, unknown> = {
      context: this.context,
      module,
      function: functionName,
    };

    if (inputData !== undefined) meta.inputData = inputData;
    if (outputData !== undefined) meta.outputData = outputData;

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
