/**
 * S3 helper utilities.
 * NOTE: Actual S3 writes MUST only be performed by audit-service.
 * This helper is for shared types/utilities (e.g. key naming) if needed.
 */

export interface S3WriteOptions {
  bucket: string;
  key: string;
  body: string | Buffer;
  contentType?: string;
}

// TODO: Audit-service will implement actual S3 put; this is placeholder for shared key/format conventions
export function buildAuditLogKey(service: string, date: string): string {
  return `audit/${service}/${date}.json`;
}
