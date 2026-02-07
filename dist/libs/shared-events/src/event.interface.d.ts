export declare const EVENT_VERSION = "1.0";
export interface BaseEvent<T = unknown> {
    version: string;
    eventName: string;
    timestamp: string;
    correlationId?: string;
    payload: T;
    source: string;
}
export declare function createBaseEvent<T>(eventName: string, payload: T, source: string, correlationId?: string): BaseEvent<T>;
