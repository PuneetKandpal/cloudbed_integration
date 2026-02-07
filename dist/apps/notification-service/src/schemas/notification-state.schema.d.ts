import { Document } from 'mongoose';
export type NotificationStateDocument = NotificationState & Document;
export declare class NotificationState {
    userId: string;
    channel: string;
    status: string;
    subject?: string;
    body?: string;
    sentAt?: Date;
    metadata?: Record<string, unknown>;
}
export declare const NotificationStateSchema: import("mongoose").Schema<NotificationState, import("mongoose").Model<NotificationState, any, any, any, Document<unknown, any, NotificationState, any, {}> & NotificationState & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NotificationState, Document<unknown, {}, import("mongoose").FlatRecord<NotificationState>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<NotificationState> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
