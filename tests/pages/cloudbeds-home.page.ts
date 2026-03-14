import { expect, type Page } from '@playwright/test';

export class CloudbedsHomePage {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('https://www.cloudbeds.com/');
  }

  async acceptCookiesIfVisible(): Promise<void> {
    const acceptButton = this.page.getByRole('button', {
      name: 'Accept All Cookies',
    });

    if (await acceptButton.isVisible().catch(() => false)) {
      await acceptButton.click();
    }
  }

  async clickLogin(): Promise<void> {
    await this.page.getByRole('link', { name: 'Login' }).click();
    await expect(this.page).toHaveURL(/signin\.cloudbeds\.com/);
  }
}
