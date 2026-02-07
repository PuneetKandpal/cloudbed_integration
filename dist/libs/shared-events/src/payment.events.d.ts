import { BaseEvent } from './event.interface';
export interface PaymentSuccessPayload {
    paymentId: string;
    bookingId: string;
    amount: number;
    currency: string;
}
export type PaymentSuccessEvent = BaseEvent<PaymentSuccessPayload>;
export interface PaymentFailurePayload {
    paymentId?: string;
    bookingId: string;
    reason: string;
}
export type PaymentFailureEvent = BaseEvent<PaymentFailurePayload>;
