import { test } from '@playwright/test';
import { CloudbedsHomePage } from './pages/cloudbeds-home.page';
import { CloudbedsSignInPage } from './pages/cloudbeds-signin.page';
import { resolveTotpCode } from './utils/totp';

const username = process.env.CLOUDBEDS_USERNAME;
const password = process.env.CLOUDBEDS_PASSWORD;

test.describe('Cloudbeds login', () => {
  test('logs in with password and Google Authenticator', async ({ page }) => {
    test.skip(!username || !password, 'Set CLOUDBEDS_USERNAME and CLOUDBEDS_PASSWORD before running this test.');

    const homePage = new CloudbedsHomePage(page);
    const signInPage = new CloudbedsSignInPage(page);

    await homePage.goto();
    await homePage.acceptCookiesIfVisible();
    await homePage.clickLogin();

    await signInPage.enterUsername(username!);
    await signInPage.enterPassword(password!);
    await signInPage.waitForTotpStep();

    const totpCode = resolveTotpCode();
    await signInPage.enterTotp(totpCode);

    await page.waitForURL(/cloudbeds\.com|myfrontdesk\.cloudbeds\.com|auth\.cloudbeds\.com/, {
      timeout: 30000,
    });
  });
});
