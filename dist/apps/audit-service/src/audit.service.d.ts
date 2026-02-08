import { Model } from 'mongoose';
export declare class AuditService {
    private readonly auditModel;
    constructor(auditModel: Model<any>);
    recordEvent(eventName: string, payload: any, source: string, correlationId?: string | null): Promise<void>;
}
