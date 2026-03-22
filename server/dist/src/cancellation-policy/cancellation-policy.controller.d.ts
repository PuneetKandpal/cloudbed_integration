import { CancellationPolicyService } from './cancellation-policy.service';
export declare class CancellationPolicyController {
    private readonly cancellationPolicyService;
    constructor(cancellationPolicyService: CancellationPolicyService);
    getCancellationPolicy(propertyId?: string, requestId?: string): Promise<{
        id: string;
        propertyId: string | null;
        createdAt: Date;
        updatedAt: Date;
        daysBeforeCheckin: number;
    }>;
    updateCancellationPolicy(body: {
        propertyId?: string | null;
        daysBeforeCheckin: number;
        requestId?: string;
    }): Promise<{
        id: string;
        propertyId: string | null;
        createdAt: Date;
        updatedAt: Date;
        daysBeforeCheckin: number;
    }>;
    deleteCancellationPolicyByProperty(propertyId: string, requestId?: string): Promise<{
        success: boolean;
        deletedPolicyId: string;
    }>;
    deleteGlobalCancellationPolicy(requestId?: string): Promise<{
        success: boolean;
        deletedPolicyId: string;
    }>;
}
