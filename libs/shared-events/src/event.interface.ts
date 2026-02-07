/**
 * Base event interface with versioning support.
 * All RabbitMQ payloads should conform to this shape.
 */

export const EVENT_VERSION = '1.0';

export interface BaseEvent<T = unknown> {
  version: string;
  eventName: string;
  timestamp: string;
  correlationId?: string;
  payload: T;
  source: string;
}

export function createBaseEvent<T>(
  eventName: string,
  payload: T,
  source: string,
  correlationId?: string,
): BaseEvent<T> {
  return {
    version: EVENT_VERSION,
    eventName,
    timestamp: new Date().toISOString(),
    correlationId,
    payload,
    source,
  };
}
