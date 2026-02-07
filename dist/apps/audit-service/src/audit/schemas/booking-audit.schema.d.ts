import { Schema } from 'mongoose';
export declare const BookingAuditSchema: Schema<any, import("mongoose").Model<any, any, any, any, any, any>, {}, {}, {}, {}, {
    strict: false;
}, {
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    booking?: any;
    payment?: any;
    pricing?: any;
    financial?: any;
    communications?: any;
    rawPayload?: any;
    timestamps?: any;
}, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<{
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    booking?: any;
    payment?: any;
    pricing?: any;
    financial?: any;
    communications?: any;
    rawPayload?: any;
    timestamps?: any;
}>, {}, import("mongoose").ResolveSchemaOptions<{
    strict: false;
}>> & import("mongoose").FlatRecord<{
    eventType?: string | null | undefined;
    source?: string | null | undefined;
    correlationId?: string | null | undefined;
    guest?: any;
    booking?: any;
    payment?: any;
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
