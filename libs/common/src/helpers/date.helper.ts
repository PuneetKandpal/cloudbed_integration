/**
 * Shared date/time utilities.
 * TODO: Add timezone handling, formatting helpers as needed.
 */

export function toISOString(date: Date): string {
  return date.toISOString();
}

export function parseISO(iso: string): Date {
  return new Date(iso);
}
