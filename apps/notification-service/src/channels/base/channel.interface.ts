/**
 * Base interface for notification channel payloads.
 */

export interface ChannelPayload {
  userId: string;
  subject?: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface ChannelResult {
  success: boolean;
  externalId?: string;
  error?: string;
}
