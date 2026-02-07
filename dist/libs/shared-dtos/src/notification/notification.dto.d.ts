export interface NotificationCreateDto {
    userId: string;
    channel: 'email' | 'sms' | 'push';
    subject?: string;
    body: string;
    metadata?: Record<string, unknown>;
}
export interface NotificationResponseDto {
    id: string;
    userId: string;
    channel: string;
    status: string;
    createdAt: string;
    sentAt?: string;
}
