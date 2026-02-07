/**
 * Central event names for RabbitMQ.
 * All services must use these constants to publish/consume events.
 */

export const EVENT_NAMES = {
  // Booking domain
  BOOKING_CREATED: 'booking.created',
  BOOKING_UPDATED: 'booking.updated',
  BOOKING_CANCELLED: 'booking.cancelled',

  // Cloudbeds integration (normalized)
  CLOUDBEDS_BOOKING_RECEIVED: 'cloudbeds.booking.received',
  CLOUDBEDS_PAYMENT_RECEIVED: 'cloudbeds.payment.received',

  // Payment policy
  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILURE: 'payment.failure',
  PAYMENT_POLICY_DECIDED: 'payment.policy.decided',

  // Notifications
  NOTIFICATION_REQUESTED: 'notification.requested',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_FAILED: 'notification.failed',

  // Audit (consumed by audit-service only)
  AUDIT_LOG: 'audit.log',
} as const;

export type EventName = (typeof EVENT_NAMES)[keyof typeof EVENT_NAMES];
