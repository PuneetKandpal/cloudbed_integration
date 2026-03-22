import { chromium, expect, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { LoggerService } from '../common/logger/logger.service';

const logger = new LoggerService('CloudbedsChargeAutomation');

type ChargeAutomationParams = {
  prisma: PrismaClient;
  propertyId: string;
  reservationId: string;
  amount: number;
  currency: string;
  taskId: string;
  requestId?: string | null;
};

function normalizePropertyId(propertyId: string): string {
  const normalized = propertyId.trim().replace(/[^\d].*$/, '');

  if (!normalized) {
    throw new Error(`Invalid Cloudbeds property id: "${propertyId}"`);
  }

  return normalized;
}

function buildDashboardUrl(propertyId: string): string {
  return `https://hotels.cloudbeds.com/connect/${normalizePropertyId(propertyId)}#/dashboard`;
}

function buildReservationsUrl(propertyId: string): string {
  return `https://hotels.cloudbeds.com/connect/${normalizePropertyId(propertyId)}#/reservations`;
}

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

function resolveTotpCode(): string {
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

function getSessionEncryptionKey(): Buffer {
  const raw = process.env.CLOUDBEDS_SESSION_ENCRYPTION_KEY?.trim();
  if (!raw) {
    throw new Error('Missing CLOUDBEDS_SESSION_ENCRYPTION_KEY (32-byte base64).');
  }

  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) {
    throw new Error('CLOUDBEDS_SESSION_ENCRYPTION_KEY must be 32 bytes when base64-decoded.');
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

function getHumanDelayConfig(): {
  baseMs: number;
  jitterMs: number;
  observeMs: number;
  reservationsBeforeTypeMs: number;
  creditCardsWaitMs: number;
} {
  const baseMs = Number.parseInt(process.env.CLOUDBEDS_HUMAN_DELAY_MS ?? '800', 10);
  const jitterMs = Number.parseInt(process.env.CLOUDBEDS_HUMAN_JITTER_MS ?? '400', 10);
  const observeMs = Number.parseInt(process.env.CLOUDBEDS_OBSERVE_MS ?? '10', 10);
  const reservationsBeforeTypeMs = Number.parseInt(process.env.CLOUDBEDS_RESERVATIONS_BEFORE_TYPE_MS ?? '0', 10);
  const creditCardsWaitMs = Number.parseInt(process.env.CLOUDBEDS_CREDIT_CARDS_WAIT_MS ?? '0', 10);

  return {
    baseMs: Number.isFinite(baseMs) ? baseMs : 800,
    jitterMs: Number.isFinite(jitterMs) ? jitterMs : 400,
    observeMs: Number.isFinite(observeMs) ? observeMs : 10,
    reservationsBeforeTypeMs: Number.isFinite(reservationsBeforeTypeMs) ? reservationsBeforeTypeMs : 0,
    creditCardsWaitMs: Number.isFinite(creditCardsWaitMs) ? creditCardsWaitMs : 0,
  };
}

async function humanDelay(page: Page, requestId: string, reason: string): Promise<void> {
  const { baseMs, jitterMs } = getHumanDelayConfig();
  const ms = Math.max(0, baseMs) + Math.floor(Math.random() * Math.max(0, jitterMs));

  logger.logInfo('Human delay before next action', 'CloudbedsChargeAutomation', 'humanDelay', requestId, {
    reason,
    ms,
  });
  await page.waitForTimeout(ms);
}

async function observePause(page: Page, requestId: string, reason: string): Promise<void> {
  const { observeMs } = getHumanDelayConfig();
  if (observeMs <= 0) {
    return;
  }

  logger.logInfo('Observability wait', 'CloudbedsChargeAutomation', 'observePause', requestId, {
    reason,
    observeMs,
  });
  await page.waitForTimeout(observeMs);
}

async function createAuthenticatedContext(prisma: PrismaClient, browser: Browser, propertyId: string, requestId: string): Promise<BrowserContext> {
  const username = process.env.CLOUDBEDS_USERNAME?.trim();
  const password = process.env.CLOUDBEDS_PASSWORD?.trim();

  if (!username || !password) {
    throw new Error('Missing CLOUDBEDS_USERNAME or CLOUDBEDS_PASSWORD');
  }

  const normalizedPropertyId = normalizePropertyId(propertyId);
  const key = getSessionEncryptionKey();

  const existingSession = await prisma.cloudbedsSession.findUnique({
    where: {
      username_propertyId: {
        username,
        propertyId: normalizedPropertyId,
      },
    },
  });

  const isExpired = existingSession?.expiresAt ? existingSession.expiresAt.getTime() <= Date.now() : false;

  let context: BrowserContext;

  if (existingSession && !isExpired) {
    const decrypted = decryptStringAes256Gcm(existingSession.encryptedState, existingSession.iv, existingSession.authTag, key);
    context = await browser.newContext({ storageState: JSON.parse(decrypted) });
    logger.logInfo('Loaded persisted Cloudbeds session', 'CloudbedsChargeAutomation', 'createAuthenticatedContext', requestId, {
      propertyId: normalizedPropertyId,
      username,
    });
  } else {
    context = await browser.newContext();
  }

  const page = await context.newPage();
  await page.goto('https://www.cloudbeds.com/');

  const acceptCookies = page.getByRole('button', { name: 'Accept All Cookies' });
  if (await acceptCookies.isVisible().catch(() => false)) {
    await acceptCookies.click();
  }

  const loginLink = page.getByRole('link', { name: 'Login' });
  if (await loginLink.isVisible().catch(() => false)) {
    await loginLink.click();
  }

  if (!/hotels\.cloudbeds\.com\/connect/.test(page.url())) {
    await page.getByRole('textbox', { name: 'Username' }).fill(username);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Verify' }).first().click();
    await page.getByText('Verify with Google Authenticator').waitFor({ timeout: 60000 });
    await page.getByRole('textbox', { name: 'Enter code' }).fill(resolveTotpCode());
    await page.getByRole('button', { name: 'Verify' }).last().click();

    const invalidCode = page.getByText("Your code doesn't match our records");

    await Promise.race([
      page.waitForURL(/hotels\.cloudbeds\.com\//, { timeout: 120000 }),
      invalidCode.waitFor({ timeout: 120000 }),
    ]);

    if (await invalidCode.isVisible().catch(() => false)) {
      throw new Error('TOTP verification failed: invalid code');
    }
  }

  await page.goto(buildDashboardUrl(normalizedPropertyId), { waitUntil: 'domcontentloaded' });
  await page.waitForURL(new RegExp(`hotels\\.cloudbeds\\.com/connect/${normalizedPropertyId}#/(dashboard)?`), { timeout: 120000 });

  const state = await context.storageState();
  const stateJson = JSON.stringify(state);
  const encrypted = encryptStringAes256Gcm(stateJson, key);

  await prisma.cloudbedsSession.upsert({
    where: {
      username_propertyId: {
        username,
        propertyId: normalizedPropertyId,
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
      propertyId: normalizedPropertyId,
      encryptedState: encrypted.cipherTextB64,
      iv: encrypted.ivB64,
      authTag: encrypted.tagB64,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  await page.close();
  return context;
}

function getReservationsMenuItem(page: Page): Locator {
  return page
    .locator('[data-testid="menu-reservations"]')
    .or(page.getByRole('link', { name: 'Reservations' }))
    .or(page.getByRole('menuitem', { name: 'Reservations' }))
    .first();
}

function getReservationsSearchInput(page: Page): Locator {
  return page
    .locator('input[name="find_reservations"]')
    .or(page.locator('input.query_reservations'))
    .or(page.locator('input[placeholder="Enter search terms"]'))
    .first();
}

async function openSideDrawerIfNeeded(page: Page, requestId: string): Promise<void> {
  const reservationsMenuItem = page.locator('[data-testid="menu-reservations"]');
  const reservationsLink = page.getByRole('link', { name: 'Reservations' });
  const reservationsMenuItemByRole = page.getByRole('menuitem', { name: 'Reservations' });
  const menuButton = page.locator('button[aria-label="Menu"]').first();

  if (await reservationsMenuItem.isVisible().catch(() => false)) return;
  if (await reservationsLink.isVisible().catch(() => false)) return;
  if (await reservationsMenuItemByRole.isVisible().catch(() => false)) return;

  await Promise.race([
    reservationsMenuItem.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    reservationsLink.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    reservationsMenuItemByRole.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    menuButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
  ]);

  if (await reservationsMenuItem.isVisible().catch(() => false)) return;
  if (await reservationsLink.isVisible().catch(() => false)) return;
  if (await reservationsMenuItemByRole.isVisible().catch(() => false)) return;

  if (!(await menuButton.isVisible().catch(() => false))) {
    throw new Error('Unable to find the Cloudbeds menu button to open the side drawer.');
  }

  await humanDelay(page, requestId, 'before-click-menu-button');
  await menuButton.click();
  await Promise.race([
    reservationsMenuItem.waitFor({ state: 'visible', timeout: 30000 }),
    reservationsLink.waitFor({ state: 'visible', timeout: 30000 }),
    reservationsMenuItemByRole.waitFor({ state: 'visible', timeout: 30000 }),
  ]);
}

async function clickReservationNameFromResults(page: Page, requestId: string, reservationId: string): Promise<void> {
  const resultsRow = page.getByRole('row', { name: new RegExp(reservationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).first();
  await resultsRow.waitFor({ state: 'visible', timeout: 60000 });

  const nameLink = resultsRow.getByRole('link').first();
  await humanDelay(page, requestId, 'before-click-reservation-name');
  await Promise.all([
    page.waitForURL(/#\/reservations\/[0-9]+/, { timeout: 120000 }),
    nameLink.click(),
  ]);
}

async function openCreditCardsTab(page: Page, requestId: string): Promise<void> {
  const creditCardsTab = page.getByRole('link', { name: 'Credit Cards' });
  const addCardButton = page.getByRole('button', { name: /add card/i });

  await creditCardsTab.waitFor({ state: 'visible', timeout: 60000 });
  await humanDelay(page, requestId, 'before-click-credit-cards-tab');
  await creditCardsTab.click();
  await addCardButton.waitFor({ state: 'visible', timeout: 120000 });
  await observePause(page, requestId, 'after-credit-cards-tab-load');

  const { creditCardsWaitMs } = getHumanDelayConfig();
  if (creditCardsWaitMs > 0) {
    await page.waitForTimeout(creditCardsWaitMs);
  }
}

async function clickAuthorizeButtonOnSelectedCard(page: Page, requestId: string): Promise<void> {
  const byRoleButton = page.getByRole('button', { name: /authorize/i }).first();
  const byAriaRole = page.locator('[role="button"]', { hasText: /^Authorize$/ }).first();
  const byExactText = page.getByText(/^Authorize$/, { exact: true }).first();
  const authorizeControl = byRoleButton.or(byAriaRole).or(byExactText).first();

  await authorizeControl.waitFor({ state: 'visible', timeout: 60000 });
  await humanDelay(page, requestId, 'before-click-authorize-button');
  await authorizeControl.click();
  await observePause(page, requestId, 'after-click-authorize-button');
}

function getChargeAmountInput(modal: Locator): Locator {
  return modal
    .locator('input[data-hook="auth-credit-card-amount"]')
    .or(modal.locator('input[data-hook="capture-amount"]'))
    .or(modal.locator('input[name="amount"]'))
    .or(modal.getByRole('textbox').first())
    .first();
}

async function authorizeCreditCardInModal(page: Page, requestId: string, amount: string): Promise<void> {
  const modalContentCandidate = page.locator('.modal-content').filter({ hasText: /authorize credit card/i });
  const modalContent = (await modalContentCandidate.count().catch(() => 0)) > 0
    ? modalContentCandidate.first()
    : page.locator('#card-details').filter({ hasText: /authorize credit card/i }).first();

  await modalContent.waitFor({ state: 'visible', timeout: 60000 });

  const boldTitle = modalContent.locator('h4.modal-title.bold').filter({ hasText: /authorize credit card/i });
  const modalTitle =
    (await boldTitle.count().catch(() => 0)) > 0
      ? boldTitle.first()
      : modalContent.getByRole('heading', { name: /authorize credit card/i }).first();

  await expect(modalTitle).toBeVisible({ timeout: 60000 });

  const amountInput = getChargeAmountInput(modalContent);
  await expect(amountInput).toBeVisible({ timeout: 60000 });
  await humanDelay(page, requestId, 'before-fill-auth-amount');
  await amountInput.fill(amount);

  const authorizeButton = modalContent
    .locator('[data-hook="auth-credit-card-confirm"]')
    .or(modalContent.getByRole('button', { name: /^Authorize$/ }).first())
    .first();
  await expect(authorizeButton).toBeVisible({ timeout: 60000 });
  await humanDelay(page, requestId, 'before-click-auth-confirm');
  await authorizeButton.click();

  await Promise.race([
    modalContent.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => undefined),
    modalContent.waitFor({ state: 'detached', timeout: 60000 }).catch(() => undefined),
    page.getByText(/success!/i).first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => undefined),
  ]);

  const captureButton = page.locator('[data-hook="capture-card"]').first();
  const voidButton = page.locator('[data-hook="void-card"]').first();
  await expect(captureButton).toBeVisible({ timeout: 60000 });
  await expect(voidButton).toBeVisible({ timeout: 60000 });
}

async function captureAuthorizedAmount(page: Page, requestId: string, amount: string): Promise<void> {
  const captureButton = page.locator('[data-hook="capture-card"]').first();
  await expect(captureButton).toBeVisible({ timeout: 60000 });
  await humanDelay(page, requestId, 'before-click-capture-button');
  await captureButton.click();

  const captureModal = page.locator('.modal-content').filter({ hasText: /capture/i }).first();
  await captureModal.waitFor({ state: 'visible', timeout: 60000 });

  const amountInput = getChargeAmountInput(captureModal);
  await expect(amountInput).toBeVisible({ timeout: 60000 });
  await amountInput.fill(amount);

  const captureConfirmButton = captureModal
    .locator('[data-hook="capture-confirm"]')
    .or(captureModal.locator('[data-hook*="capture"][data-hook*="confirm"]').first())
    .or(captureModal.getByRole('button', { name: /^Capture$/ }).first())
    .first();

  await expect(captureConfirmButton).toBeVisible({ timeout: 60000 });
  await humanDelay(page, requestId, 'before-click-capture-confirm');
  await captureConfirmButton.click();

  await Promise.race([
    captureModal.waitFor({ state: 'hidden', timeout: 60000 }).catch(() => undefined),
    captureModal.waitFor({ state: 'detached', timeout: 60000 }).catch(() => undefined),
    page.getByText(/success!/i).first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => undefined),
  ]);
}

async function goToReservationAndCapture(page: Page, propertyId: string, reservationId: string, amount: string, requestId: string): Promise<void> {
  const normalizedPropertyId = normalizePropertyId(propertyId);

  await page.goto(buildDashboardUrl(normalizedPropertyId), { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(buildDashboardUrl(normalizedPropertyId), { timeout: 120000 });
  await observePause(page, requestId, 'after-dashboard-load');

  await openSideDrawerIfNeeded(page, requestId);
  await humanDelay(page, requestId, 'before-click-reservations');
  await getReservationsMenuItem(page).click();

  await expect(page).toHaveURL(buildReservationsUrl(normalizedPropertyId), { timeout: 120000 });
  await observePause(page, requestId, 'after-reservations-load');

  const searchBox = getReservationsSearchInput(page);
  await expect(searchBox).toBeVisible({ timeout: 60000 });

  const { reservationsBeforeTypeMs } = getHumanDelayConfig();
  if (reservationsBeforeTypeMs > 0) {
    await page.waitForTimeout(reservationsBeforeTypeMs);
  }

  await humanDelay(page, requestId, 'before-fill-reservation-search');
  await searchBox.fill(reservationId);

  await clickReservationNameFromResults(page, requestId, reservationId);
  await observePause(page, requestId, 'after-reservation-details-load');
  await openCreditCardsTab(page, requestId);
  await clickAuthorizeButtonOnSelectedCard(page, requestId);
  await authorizeCreditCardInModal(page, requestId, amount);
  await captureAuthorizedAmount(page, requestId, amount);
}

export async function runCloudbedsChargeAutomation(params: ChargeAutomationParams): Promise<void> {
  const requestId = params.requestId?.trim() || logger.generateRequestId();
  const amount = String(params.amount);
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;

  logger.logInfo('Running Cloudbeds charge automation', 'CloudbedsChargeAutomation', 'runCloudbedsChargeAutomation', requestId, {
    taskId: params.taskId,
    propertyId: params.propertyId,
    reservationId: params.reservationId,
    amount: params.amount,
    currency: params.currency,
  });

  try {
    browser = await chromium.launch({
      headless: process.env.CLOUDBEDS_HEADLESS === 'true',
      slowMo: Number.parseInt(process.env.CLOUDBEDS_SLOW_MO_MS ?? '150', 10),
    });

    context = await createAuthenticatedContext(params.prisma, browser, params.propertyId, requestId);
    const page = await context.newPage();

    await goToReservationAndCapture(page, params.propertyId, params.reservationId, amount, requestId);

    logger.logInfo('Cloudbeds charge automation completed', 'CloudbedsChargeAutomation', 'runCloudbedsChargeAutomation', requestId, {
      taskId: params.taskId,
      finalUrl: page.url(),
    });
  } finally {
    if (context) {
      await context.close().catch(() => undefined);
    }
    if (browser) {
      await browser.close().catch(() => undefined);
    }
  }
}
