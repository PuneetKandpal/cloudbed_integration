import { chromium, type FullConfig } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

function decodeBase32(value: string): Buffer {
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

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateTotp(secret: string, timeStepSeconds = 30, digits = 6): string {
  const counter = Math.floor(Date.now() / 1000 / timeStepSeconds);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const key = decodeBase32(secret);
  const digest = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binaryCode =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  return String(binaryCode % 10 ** digits).padStart(digits, '0');
}

function resolveTotpCodeFromEnv(): string {
  const manualCode = process.env.CLOUDBEDS_TOTP_CODE?.trim();
  if (manualCode) {
    return manualCode;
  }

  const secret = process.env.CLOUDBEDS_TOTP_SECRET?.trim();
  if (!secret) {
    throw new Error(
      'Set CLOUDBEDS_TOTP_SECRET for automatic 2FA or CLOUDBEDS_TOTP_CODE for a one-time manual run.',
    );
  }

  return generateTotp(secret);
}

function getSessionEncryptionKey(): Buffer {
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

function encryptStringAes256Gcm(plainText: string, key: Buffer): { cipherTextB64: string; ivB64: string; tagB64: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const cipherText = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    cipherTextB64: cipherText.toString('base64'),
    ivB64: iv.toString('base64'),
    tagB64: tag.toString('base64'),
  };
}

function decryptStringAes256Gcm(cipherTextB64: string, ivB64: string, tagB64: string, key: Buffer): string {
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const cipherText = Buffer.from(cipherTextB64, 'base64');

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return plain.toString('utf8');
}

function normalizePropertyId(propertyId: string): string {
  const normalized = propertyId.trim().replace(/[^\d].*$/, '');

  if (!normalized) {
    throw new Error(`Invalid CLOUDBEDS_PROPERTY_ID: "${propertyId}"`);
  }

  return normalized;
}

async function globalSetup(_config: FullConfig): Promise<void> {
  const storageStatePath = path.resolve(__dirname, '.auth/cloudbeds.storageState.json');

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

  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  const prisma = new PrismaClient();
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
      const decrypted = decryptStringAes256Gcm(
        existingSession.encryptedState,
        existingSession.iv,
        existingSession.authTag,
        key,
      );

      fs.writeFileSync(storageStatePath, decrypted, 'utf8');
      return;
    }

    const browser = await chromium.launch({ headless: false, slowMo: 150 });
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
    fs.writeFileSync(storageStatePath, stateJson, 'utf8');

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
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
