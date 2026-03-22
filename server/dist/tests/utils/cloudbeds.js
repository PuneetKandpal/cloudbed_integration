"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractPropertyIdFromConnectUrl = extractPropertyIdFromConnectUrl;
exports.normalizePropertyId = normalizePropertyId;
exports.buildDashboardUrl = buildDashboardUrl;
exports.buildReservationsUrl = buildReservationsUrl;
function extractPropertyIdFromConnectUrl(url) {
    const match = url.match(/hotels\.cloudbeds\.com\/connect\/(\d+)/);
    return match?.[1] ?? null;
}
function normalizePropertyId(propertyId) {
    const normalized = propertyId.trim().replace(/[^\d].*$/, '');
    if (!normalized) {
        throw new Error(`Invalid Cloudbeds property id: "${propertyId}"`);
    }
    return normalized;
}
function buildDashboardUrl(propertyId) {
    const normalizedPropertyId = normalizePropertyId(propertyId);
    return `https://hotels.cloudbeds.com/connect/${normalizedPropertyId}#/dashboard`;
}
function buildReservationsUrl(propertyId) {
    const normalizedPropertyId = normalizePropertyId(propertyId);
    return `https://hotels.cloudbeds.com/connect/${normalizedPropertyId}#/reservations`;
}
//# sourceMappingURL=cloudbeds.js.map