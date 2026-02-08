export declare class LoggerService {
    private context;
    setContext(context: string): void;
    log(message: string): void;
    error(message: string, error?: any): void;
    warn(message: string): void;
    debug(message: string): void;
}
