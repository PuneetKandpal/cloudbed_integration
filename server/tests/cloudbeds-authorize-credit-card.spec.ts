import { test } from '@playwright/test';
import { goToReservationsSearchAndAuthorizeCreditCard } from './utils/cloudbeds-reservations-flow';

test.describe('Cloudbeds credit cards', () => {
  test('authorizes credit card for 10 and validates modal title', async ({ page }) => {
    test.setTimeout(240000);

    const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
    if (!propertyId) {
      test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the reservations URL.');
      return;
    }

    const reservationId = (process.env.CLOUDBEDS_RESERVATION_ID ?? '1234567890').trim();
    const amount = (process.env.CLOUDBEDS_AUTH_AMOUNT ?? '10').trim();

    await goToReservationsSearchAndAuthorizeCreditCard(page, propertyId, reservationId, amount);
  });
});
