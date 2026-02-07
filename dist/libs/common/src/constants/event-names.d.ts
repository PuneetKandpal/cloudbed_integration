export declare const EVENT_NAMES: {
    readonly BOOKING_CREATED: "booking.created";
    readonly BOOKING_UPDATED: "booking.updated";
    readonly BOOKING_CANCELLED: "booking.cancelled";
    readonly CLOUDBEDS_BOOKING_RECEIVED: "cloudbeds.booking.received";
    readonly CLOUDBEDS_PAYMENT_RECEIVED: "cloudbeds.payment.received";
    readonly PAYMENT_SUCCESS: "payment.success";
    readonly PAYMENT_FAILURE: "payment.failure";
    readonly PAYMENT_POLICY_DECIDED: "payment.policy.decided";
    readonly NOTIFICATION_REQUESTED: "notification.requested";
    readonly NOTIFICATION_SENT: "notification.sent";
    readonly NOTIFICATION_FAILED: "notification.failed";
    readonly AUDIT_LOG: "audit.log";
};
export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
