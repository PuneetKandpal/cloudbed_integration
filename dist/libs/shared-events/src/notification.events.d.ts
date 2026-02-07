import { BaseEvent } from './event.interface';
export interface NotificationRequestedPayload {
    userId: string;
    channel: 'email' | 'sms' | 'push';
    subject?: string;
    body: string;
    metadata?: Record<string, unknown>;
}
export type NotificationRequestedEvent = BaseEvent<NotificationRequestedPayload>;
export interface NotificationSentPayload {
    notificationId: string;
    channel: string;
    userId: string;
}
export type NotificationSentEvent = BaseEvent<NotificationSentPayload>;
export interface NotificationFailedPayload {
    notificationId?: string;
    channel: string;
    userId: string;
    reason: string;
}
export type NotificationFailedEvent = BaseEvent<NotificationFailedPayload>;
