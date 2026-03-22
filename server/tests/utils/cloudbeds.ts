export function extractPropertyIdFromConnectUrl(url: string): string | null {
  const match = url.match(/hotels\.cloudbeds\.com\/connect\/(\d+)/);
  return match?.[1] ?? null;
}

export function normalizePropertyId(propertyId: string): string {
  const normalized = propertyId.trim().replace(/[^\d].*$/, '');

  if (!normalized) {
    throw new Error(`Invalid Cloudbeds property id: "${propertyId}"`);
  }

  return normalized;
}

export function buildDashboardUrl(propertyId: string): string {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  return `https://hotels.cloudbeds.com/connect/${normalizedPropertyId}#/dashboard`;
}

export function buildReservationsUrl(propertyId: string): string {
  const normalizedPropertyId = normalizePropertyId(propertyId);
  return `https://hotels.cloudbeds.com/connect/${normalizedPropertyId}#/reservations`;
}
