import { Schema } from 'mongoose';
export declare const BookingAuditSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    strict: false;
}, {
    booking?: any;
    payment?: any;
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    pricing?: any;
    financial?: any;
    communications?: any;
    rawPayload?: any;
    timestamps?: any;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    booking?: any;
    payment?: any;
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    pricing?: any;
    financial?: any;
    communications?: any;
    rawPayload?: any;
    timestamps?: any;
}>, {}, import("mongoose").ResolveSchemaOptions<{
    strict: false;
}>> & import("mongoose").FlatRecord<{
    booking?: any;
    payment?: any;
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    pricing?: any;
    financial?: any;
    communications?: any;
    rawPayload?: any;
    timestamps?: any;
}> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
