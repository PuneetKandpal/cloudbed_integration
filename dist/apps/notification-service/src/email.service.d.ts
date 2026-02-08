import { LoggerService } from './logger.service';
export declare class EmailService {
    private readonly logger;
    constructor(logger: LoggerService);
    send(to: string, subject: string, body: string): Promise<void>;
}
