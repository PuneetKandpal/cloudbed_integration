"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudbedsSignInPage = void 0;
const test_1 = require("@playwright/test");
class CloudbedsSignInPage {
    page;
    usernameInput;
    nextButton;
    passwordInput;
    verifyPasswordButton;
    totpInput;
    verifyTotpButton;
    constructor(page) {
        this.page = page;
        this.usernameInput = page.getByRole('textbox', { name: 'Username' });
        this.nextButton = page.getByRole('button', { name: 'Next' });
        this.passwordInput = page.getByLabel('Password');
        this.verifyPasswordButton = page.getByRole('button', { name: 'Verify' }).first();
        this.totpInput = page.getByRole('textbox', { name: 'Enter code' });
        this.verifyTotpButton = page.getByRole('button', { name: 'Verify' }).last();
    }
    async enterUsername(username) {
        await (0, test_1.expect)(this.usernameInput).toBeVisible();
        await this.usernameInput.fill(username);
        await this.nextButton.click();
    }
    async enterPassword(password) {
        await (0, test_1.expect)(this.passwordInput).toBeVisible();
        await this.passwordInput.fill(password);
        await this.verifyPasswordButton.click();
    }
    async enterTotp(code) {
        await (0, test_1.expect)(this.totpInput).toBeVisible();
        await this.totpInput.fill(code);
        await this.verifyTotpButton.click();
    }
    async waitForTotpStep() {
        await (0, test_1.expect)(this.page.getByText('Verify with Google Authenticator')).toBeVisible();
        await (0, test_1.expect)(this.totpInput).toBeVisible();
    }
}
exports.CloudbedsSignInPage = CloudbedsSignInPage;
//# sourceMappingURL=cloudbeds-signin.page.js.map