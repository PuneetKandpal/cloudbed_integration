"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const cloudbeds_reservations_flow_1 = require("./utils/cloudbeds-reservations-flow");
test_1.test.describe('Cloudbeds credit cards', () => {
    (0, test_1.test)('authorizes credit card for 10 and validates modal title', async ({ page }) => {
        test_1.test.setTimeout(240000);
        const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
        if (!propertyId) {
            test_1.test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the reservations URL.');
            return;
        }
        const reservationId = (process.env.CLOUDBEDS_RESERVATION_ID ?? '1234567890').trim();
        const amount = (process.env.CLOUDBEDS_AUTH_AMOUNT ?? '10').trim();
        await (0, cloudbeds_reservations_flow_1.goToReservationsSearchAndAuthorizeCreditCard)(page, propertyId, reservationId, amount);
    });
});
//# sourceMappingURL=cloudbeds-authorize-credit-card.spec.js.map