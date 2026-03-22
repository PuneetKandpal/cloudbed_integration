"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudbedsHomePage = void 0;
const test_1 = require("@playwright/test");
class CloudbedsHomePage {
    page;
    constructor(page) {
        this.page = page;
    }
    async goto() {
        await this.page.goto('https://www.cloudbeds.com/');
    }
    async acceptCookiesIfVisible() {
        const acceptButton = this.page.getByRole('button', {
            name: 'Accept All Cookies',
        });
        if (await acceptButton.isVisible().catch(() => false)) {
            await acceptButton.click();
        }
    }
    async clickLogin() {
        await this.page.getByRole('link', { name: 'Login' }).click();
        await (0, test_1.expect)(this.page).toHaveURL(/signin\.cloudbeds\.com|hotels\.cloudbeds\.com\/connect/, {
            timeout: 30000,
        });
    }
}
exports.CloudbedsHomePage = CloudbedsHomePage;
//# sourceMappingURL=cloudbeds-home.page.js.map