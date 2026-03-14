import { expect, type Locator, type Page } from '@playwright/test';

export class CloudbedsSignInPage {
  readonly usernameInput: Locator;
  readonly nextButton: Locator;
  readonly passwordInput: Locator;
  readonly verifyPasswordButton: Locator;
  readonly totpInput: Locator;
  readonly verifyTotpButton: Locator;

  constructor(private readonly page: Page) {
    this.usernameInput = page.getByRole('textbox', { name: 'Username' });
    this.nextButton = page.getByRole('button', { name: 'Next' });
    this.passwordInput = page.getByLabel('Password');
    this.verifyPasswordButton = page.getByRole('button', { name: 'Verify' }).first();
    this.totpInput = page.getByRole('textbox', { name: 'Enter code' });
    this.verifyTotpButton = page.getByRole('button', { name: 'Verify' }).last();
  }

  async enterUsername(username: string): Promise<void> {
    await expect(this.usernameInput).toBeVisible();
    await this.usernameInput.fill(username);
    await this.nextButton.click();
  }

  async enterPassword(password: string): Promise<void> {
    await expect(this.passwordInput).toBeVisible();
    await this.passwordInput.fill(password);
    await this.verifyPasswordButton.click();
  }

  async enterTotp(code: string): Promise<void> {
    await expect(this.totpInput).toBeVisible();
    await this.totpInput.fill(code);
    await this.verifyTotpButton.click();
  }

  async waitForTotpStep(): Promise<void> {
    await expect(this.page.getByText('Verify with Google Authenticator')).toBeVisible();
    await expect(this.totpInput).toBeVisible();
  }
}
