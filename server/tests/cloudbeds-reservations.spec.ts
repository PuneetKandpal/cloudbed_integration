import { test } from '@playwright/test';
import { goToReservationsAndSearch } from './utils/cloudbeds-reservations-flow';

test.describe('Cloudbeds reservations', () => {
  test('opens Reservations and searches by reservation id', async ({ page }) => {
    test.setTimeout(180000);
    const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
    if (!propertyId) {
      test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the reservations URL.');
      return;
    }

    const reservationId = (process.env.CLOUDBEDS_RESERVATION_ID ?? '1234567890').trim();

    await goToReservationsAndSearch(page, propertyId, reservationId);
  });
});
