"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = require("node:crypto");
const client_1 = require("@prisma/client");
function decodeBase32(value) {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    const sanitized = value.toUpperCase().replace(/=+$/g, '').replace(/\s+/g, '');
    let bits = '';
    for (const char of sanitized) {
        const index = alphabet.indexOf(char);
        if (index === -1) {
            throw new Error('Invalid TOTP secret format');
        }
        bits += index.toString(2).padStart(5, '0');
    }
    const bytes = [];
    for (let i = 0; i + 8 <= bits.length; i += 8) {
        bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
    }
    return Buffer.from(bytes);
}
function generateTotp(secret, timeStepSeconds = 30, digits = 6) {
    const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigUInt64BE(BigInt(counter));
    const key = decodeBase32(secret);
    const digest = (0, node_crypto_1.createHmac)('sha1', key).update(counterBuffer).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binaryCode = ((digest[offset] & 0x7f) << 24) |
        ((digest[offset + 1] & 0xff) << 16) |
        ((digest[offset + 2] & 0xff) << 8) |
        (digest[offset + 3] & 0xff);
    return String(binaryCode % 10 ** digits).padStart(digits, '0');
}
function resolveTotpCodeFromEnv() {
    const manualCode = process.env.CLOUDBEDS_TOTP_CODE?.trim();
    if (manualCode) {
        return manualCode;
    }
    const secret = process.env.CLOUDBEDS_TOTP_SECRET?.trim();
    if (!secret) {
        throw new Error('Set CLOUDBEDS_TOTP_SECRET for automatic 2FA or CLOUDBEDS_TOTP_CODE for a one-time manual run.');
    }
    return generateTotp(secret);
}
function getSessionEncryptionKey() {
    const raw = process.env.CLOUDBEDS_SESSION_ENCRYPTION_KEY?.trim();
    if (!raw) {
        throw new Error('Missing CLOUDBEDS_SESSION_ENCRYPTION_KEY (32-byte base64).');
    }
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) {
        throw new Error('CLOUDBEDS_SESSION_ENCRYPTION_KEY must be 32 bytes when base64-decoded (AES-256 key).');
    }
    return key;
}
function encryptStringAes256Gcm(plainText, key) {
    const iv = (0, node_crypto_1.randomBytes)(12);
    const cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key, iv);
    const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
        cipherTextB64: cipherText.toString('base64'),
        ivB64: iv.toString('base64'),
        tagB64: tag.toString('base64'),
    };
}
function decryptStringAes256Gcm(cipherTextB64, ivB64, tagB64, key) {
    const iv = Buffer.from(ivB64, 'base64');
    const tag = Buffer.from(tagB64, 'base64');
    const cipherText = Buffer.from(cipherTextB64, 'base64');
    const decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
    return plain.toString('utf8');
}
function normalizePropertyId(propertyId) {
    const normalized = propertyId.trim().replace(/[^\d].*$/, '');
    if (!normalized) {
        throw new Error(`Invalid CLOUDBEDS_PROPERTY_ID: "${propertyId}"`);
    }
    return normalized;
}
async function globalSetup(_config) {
    const storageStatePath = node_path_1.default.resolve(__dirname, '.auth/cloudbeds.storageState.json');
    const username = process.env.CLOUDBEDS_USERNAME;
    const password = process.env.CLOUDBEDS_PASSWORD;
    const propertyIdFromEnv = process.env.CLOUDBEDS_PROPERTY_ID;
    if (!username || !password) {
        throw new Error('Missing CLOUDBEDS_USERNAME or CLOUDBEDS_PASSWORD');
    }
    if (!propertyIdFromEnv) {
        throw new Error('Missing CLOUDBEDS_PROPERTY_ID (required for per-property session persistence).');
    }
    const propertyId = normalizePropertyId(propertyIdFromEnv);
    node_fs_1.default.mkdirSync(node_path_1.default.dirname(storageStatePath), { recursive: true });
    const prisma = new client_1.PrismaClient();
    try {
        const key = getSessionEncryptionKey();
        const existingSession = await prisma.cloudbedsSession.findUnique({
            where: {
                username_propertyId: {
                    username,
                    propertyId,
                },
            },
        });
        const isExpired = existingSession?.expiresAt
            ? existingSession.expiresAt.getTime() <= Date.now()
            : false;
        if (existingSession && !isExpired) {
            const decrypted = decryptStringAes256Gcm(existingSession.encryptedState, existingSession.iv, existingSession.authTag, key);
            node_fs_1.default.writeFileSync(storageStatePath, decrypted, 'utf8');
            return;
        }
        const browser = await test_1.chromium.launch({ headless: false, slowMo: 150 });
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto('https://www.cloudbeds.com/');
        const acceptCookies = page.getByRole('button', { name: 'Accept All Cookies' });
        if (await acceptCookies.isVisible().catch(() => false)) {
            await acceptCookies.click();
        }
        await page.getByRole('link', { name: 'Login' }).click();
        await page.getByRole('textbox', { name: 'Username' }).fill(username);
        await page.getByRole('button', { name: 'Next' }).click();
        await page.getByLabel('Password').fill(password);
        await page.getByRole('button', { name: 'Verify' }).first().click();
        await page
            .getByText('Verify with Google Authenticator')
            .waitFor({ timeout: 60000 });
        const totpCode = resolveTotpCodeFromEnv();
        await page.getByRole('textbox', { name: 'Enter code' }).fill(totpCode);
        await page.getByRole('button', { name: 'Verify' }).last().click();
        const invalidCode = page.getByText("Your code doesn't match our records");
        await Promise.race([
            page.waitForURL(/hotels\.cloudbeds\.com\//, { timeout: 120000 }),
            invalidCode.waitFor({ timeout: 120000 }),
        ]);
        if (await invalidCode.isVisible().catch(() => false)) {
            throw new Error('TOTP verification failed: invalid code');
        }
        await page.goto(`https://hotels.cloudbeds.com/connect/${propertyId}#/dashboard`);
        await page.waitForLoadState('domcontentloaded', { timeout: 120000 });
        await page.waitForURL(new RegExp(`hotels\\.cloudbeds\\.com/connect/${propertyId}#/(dashboard)?`), {
            timeout: 120000,
        });
        const dashboardNav = page.getByRole('link', { name: 'Dashboard' });
        if (await dashboardNav.isVisible().catch(() => false)) {
            await dashboardNav.waitFor({ timeout: 120000 });
        }
        const state = await context.storageState();
        const stateJson = JSON.stringify(state);
        node_fs_1.default.writeFileSync(storageStatePath, stateJson, 'utf8');
        const encrypted = encryptStringAes256Gcm(stateJson, key);
        await prisma.cloudbedsSession.upsert({
            where: {
                username_propertyId: {
                    username,
                    propertyId,
                },
            },
            update: {
                encryptedState: encrypted.cipherTextB64,
                iv: encrypted.ivB64,
                authTag: encrypted.tagB64,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            },
            create: {
                username,
                propertyId,
                encryptedState: encrypted.cipherTextB64,
                iv: encrypted.ivB64,
                authTag: encrypted.tagB64,
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
            },
        });
        await browser.close();
    }
    finally {
        await prisma.$disconnect();
    }
}
exports.default = globalSetup;
//# sourceMappingURL=playwright.global-setup.js.map