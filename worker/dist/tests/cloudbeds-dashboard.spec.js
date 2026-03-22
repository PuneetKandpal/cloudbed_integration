"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const cloudbeds_1 = require("./utils/cloudbeds");
test_1.test.describe('Cloudbeds dashboard', () => {
    (0, test_1.test)('opens dashboard using persisted session', async ({ page }) => {
        const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
        if (!propertyId) {
            test_1.test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the dashboard URL.');
            return;
        }
        const normalizedPropertyId = (0, cloudbeds_1.normalizePropertyId)(propertyId);
        await page.goto((0, cloudbeds_1.buildDashboardUrl)(normalizedPropertyId), {
            waitUntil: 'domcontentloaded',
        });
        await (0, test_1.expect)(page).toHaveURL(/\/dashboard/, { timeout: 120000 });
        await (0, test_1.expect)(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
            timeout: 120000,
        });
    });
});
//# sourceMappingURL=cloudbeds-dashboard.spec.js.map