"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '.env') });
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    globalSetup: './playwright.global-setup',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: 'html',
    use: {
        launchOptions: {
            slowMo: 150,
        },
        storageState: path_1.default.resolve(__dirname, '.auth/cloudbeds.storageState.json'),
        trace: 'on-first-retry',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...test_1.devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...test_1.devices['Desktop Safari'] },
        },
    ],
});
//# sourceMappingURL=playwright.config.js.map