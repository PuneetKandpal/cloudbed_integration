import { Document } from 'mongoose';
export type PaymentStateDocument = PaymentState & Document;
export declare class PaymentState {
    bookingId: string;
    amount: number;
    status: string;
    currency: string;
    policyDecision?: string;
}
export declare const PaymentStateSchema: import("mongoose").Schema<PaymentState, import("mongoose").Model<PaymentState, any, any, any, Document<unknown, any, PaymentState, any, {}> & PaymentState & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PaymentState, Document<unknown, {}, import("mongoose").FlatRecord<PaymentState>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PaymentState> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
