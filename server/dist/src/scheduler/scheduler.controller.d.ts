import { SchedulerService } from './scheduler.service';
export declare class SchedulerController {
    private readonly schedulerService;
    constructor(schedulerService: SchedulerService);
    runMonitorFlexible(requestId?: string): Promise<{
        ok: boolean;
        requestId: string | null;
        job: string;
    }>;
    runProcessNonRefundable(requestId?: string): Promise<{
        ok: boolean;
        requestId: string | null;
        job: string;
    }>;
    runProcessRetries(requestId?: string): Promise<{
        ok: boolean;
        requestId: string | null;
        job: string;
    }>;
    runSendReminders(requestId?: string): Promise<{
        ok: boolean;
        requestId: string | null;
        job: string;
    }>;
    runRequestAdminCancellation(body: {
        bookingId?: string;
        reservationId?: string;
        force?: boolean;
    }, requestId?: string): Promise<{
        ok: boolean;
        requestId: string;
        error: string;
        job?: undefined;
        result?: undefined;
    } | {
        ok: boolean;
        requestId: string;
        job: string;
        result: {
            sent: boolean;
            recipients: string[];
            reason?: string;
        };
        error?: undefined;
    }>;
}
