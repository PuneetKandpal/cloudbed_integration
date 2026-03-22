import { type Page } from '@playwright/test';
export declare class CloudbedsHomePage {
    private readonly page;
    constructor(page: Page);
    goto(): Promise<void>;
    acceptCookiesIfVisible(): Promise<void>;
    clickLogin(): Promise<void>;
}
