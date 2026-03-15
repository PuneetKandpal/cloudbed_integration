import { test } from '@playwright/test';
import { LoggerService } from '../src/common/logger/logger.service';
import { CloudbedsHomePage } from './pages/cloudbeds-home.page';
import { CloudbedsSignInPage } from './pages/cloudbeds-signin.page';
import { goToReservationsAndSearch } from './utils/cloudbeds-reservations-flow';
import { normalizePropertyId } from './utils/cloudbeds';
import { resolveTotpCode } from './utils/totp';

const username = process.env.CLOUDBEDS_USERNAME;
const password = process.env.CLOUDBEDS_PASSWORD;
const logger = new LoggerService('CloudbedsLoginSpec');

test.describe('Cloudbeds login', () => {
  test('logs in with password and Google Authenticator', async ({ page }) => {
    test.setTimeout(180000);
    test.skip(!username || !password, 'Set CLOUDBEDS_USERNAME and CLOUDBEDS_PASSWORD before running this test.');
    const requestId = logger.generateRequestId();

    const homePage = new CloudbedsHomePage(page);
    const signInPage = new CloudbedsSignInPage(page);
    const propertyId = process.env.CLOUDBEDS_PROPERTY_ID;
    const normalizedPropertyId = propertyId
      ? normalizePropertyId(propertyId)
      : undefined;
    const reservationId = (process.env.CLOUDBEDS_RESERVATION_ID ?? '1234567890').trim();

    logger.logInfo('Starting Cloudbeds login test', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId, {
      propertyId,
      normalizedPropertyId,
      reservationIdLength: reservationId.length,
    });

    await homePage.goto();
    logger.logInfo('Opened Cloudbeds marketing site', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId, {
      currentUrl: page.url(),
    });
    await homePage.acceptCookiesIfVisible();
    logger.logInfo('Handled cookie banner if present', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);
    await homePage.clickLogin();
    logger.logInfo('Triggered Cloudbeds login navigation', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId, {
      currentUrl: page.url(),
    });

    // If we already have a persisted session, Cloudbeds may redirect straight to hotels.cloudbeds.com
    if (/hotels\.cloudbeds\.com\/connect/.test(page.url())) {
      if (!normalizedPropertyId) {
        test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to build the dashboard URL.');
        return;
      }

      logger.logInfo('Detected persisted session; skipping credential entry', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId, {
        currentUrl: page.url(),
      });
      await goToReservationsAndSearch(page, normalizedPropertyId, reservationId);

      if (process.env.CLOUDBEDS_DEBUG_PAUSE === 'true') {
        logger.logInfo('Pausing browser for interactive debugging after persisted-session flow', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);
        await page.pause();
      }
      return;
    }

    await signInPage.enterUsername(username!);
    logger.logInfo('Entered username', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);
    await signInPage.enterPassword(password!);
    logger.logInfo('Entered password', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);
    await signInPage.waitForTotpStep();
    logger.logInfo('Reached Google Authenticator verification step', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);

    const totpCode = resolveTotpCode();
    await signInPage.enterTotp(totpCode);
    logger.logInfo('Submitted TOTP code', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);

    // After TOTP, Cloudbeds often completes an OAuth redirect chain before you land on the app.
    // If we start our own navigation too early, Playwright can abort the in-flight redirect.
    await page.waitForURL(/hotels\.cloudbeds\.com\/connect\//, {
      timeout: 120000,
    });

    await page.waitForLoadState('domcontentloaded', { timeout: 120000 });

    logger.logInfo('Login completed successfully', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId, {
      currentUrl: page.url(),
    });

    if (!normalizedPropertyId) {
      test.skip(true, 'Set CLOUDBEDS_PROPERTY_ID (e.g. 320316) to navigate to Reservations after login.');
      return;
    }

    await goToReservationsAndSearch(page, normalizedPropertyId, reservationId);

    if (process.env.CLOUDBEDS_DEBUG_PAUSE === 'true') {
      logger.logInfo('Pausing browser for interactive debugging after reservations flow', 'CloudbedsLoginSpec', 'logs in with password and Google Authenticator', requestId);
      await page.pause();
    }
  });
});
