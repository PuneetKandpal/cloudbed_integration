import { AuditService } from '../services/audit.service';
export declare class AuditConsumer {
    private readonly auditService;
    constructor(auditService: AuditService);
    handleBookingReceived(event: any): Promise<void>;
}
