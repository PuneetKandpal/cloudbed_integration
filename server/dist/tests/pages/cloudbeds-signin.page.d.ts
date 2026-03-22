import { type Locator, type Page } from '@playwright/test';
export declare class CloudbedsSignInPage {
    private readonly page;
    readonly usernameInput: Locator;
    readonly nextButton: Locator;
    readonly passwordInput: Locator;
    readonly verifyPasswordButton: Locator;
    readonly totpInput: Locator;
    readonly verifyTotpButton: Locator;
    constructor(page: Page);
    enterUsername(username: string): Promise<void>;
    enterPassword(password: string): Promise<void>;
    enterTotp(code: string): Promise<void>;
    waitForTotpStep(): Promise<void>;
}
