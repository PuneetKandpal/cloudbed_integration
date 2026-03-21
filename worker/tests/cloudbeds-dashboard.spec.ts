import { expect, test } from '@playwright/test';
import { buildDashboardUrl, normalizePropertyId } from './utils/cloudbeds';

test.describe('Cloudbeds dashboard', () => {
  test('opens dashboard using persisted session', async ({ page }) => {
    const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
    if (!propertyId) {
      test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the dashboard URL.');
      return;
    }

    const normalizedPropertyId = normalizePropertyId(propertyId);

    await page.goto(buildDashboardUrl(normalizedPropertyId), {
      waitUntil: 'domcontentloaded',
    });

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 120000 });
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible({
      timeout: 120000,
    });
  });
});
