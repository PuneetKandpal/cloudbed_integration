import { PrismaService } from '../prisma/prisma.service';
export declare class CancellationPolicyService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getCancellationPolicy(propertyId?: string, requestId?: string): Promise<{
        id: string;
        propertyId: string | null;
        createdAt: Date;
        updatedAt: Date;
        daysBeforeCheckin: number;
    }>;
    updateCancellationPolicy(propertyId: string | null, daysBeforeCheckin: number, requestId?: string): Promise<{
        id: string;
        propertyId: string | null;
        createdAt: Date;
        updatedAt: Date;
        daysBeforeCheckin: number;
    }>;
    deleteCancellationPolicy(propertyId: string | null, requestId?: string): Promise<{
        success: boolean;
        deletedPolicyId: string;
    }>;
}
