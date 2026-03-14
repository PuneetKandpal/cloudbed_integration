import { expect, type Locator, type Page } from '@playwright/test';
import { LoggerService } from '../../src/common/logger/logger.service';
import { buildDashboardUrl, buildReservationsUrl, normalizePropertyId } from './cloudbeds';

const logger = new LoggerService('CloudbedsReservationsFlow');

function getHumanDelayConfig(): {
  baseMs: number;
  jitterMs: number;
  observeMs: number;
  reservationsBeforeTypeMs: number;
  creditCardsWaitMs: number;
} {
  const baseMs = Number.parseInt(process.env.CLOUDBEDS_HUMAN_DELAY_MS ?? '800', 10);
  const jitterMs = Number.parseInt(process.env.CLOUDBEDS_HUMAN_JITTER_MS ?? '400', 10);
  const observeMs = Number.parseInt(process.env.CLOUDBEDS_OBSERVE_MS ?? '0', 10);
  const reservationsBeforeTypeMs = Number.parseInt(
    process.env.CLOUDBEDS_RESERVATIONS_BEFORE_TYPE_MS ?? '0',
    10,
  );
  const creditCardsWaitMs = Number.parseInt(process.env.CLOUDBEDS_CREDIT_CARDS_WAIT_MS ?? '0', 10);

  return {
    baseMs: Number.isFinite(baseMs) ? baseMs : 800,
    jitterMs: Number.isFinite(jitterMs) ? jitterMs : 400,
    observeMs: Number.isFinite(observeMs) ? observeMs : 0,
    reservationsBeforeTypeMs: Number.isFinite(reservationsBeforeTypeMs)
      ? reservationsBeforeTypeMs
      : 0,
    creditCardsWaitMs: Number.isFinite(creditCardsWaitMs) ? creditCardsWaitMs : 0,
  };
}

async function waitBeforeTypingOnReservations(page: Page, requestId: string): Promise<void> {
  const { reservationsBeforeTypeMs } = getHumanDelayConfig();

  if (!reservationsBeforeTypeMs || reservationsBeforeTypeMs <= 0) return;

  logger.logInfo(
    'Waiting on reservations page before typing reservation id',
    'CloudbedsReservationsFlow',
    'waitBeforeTypingOnReservations',
    requestId,
    {
      reservationsBeforeTypeMs,
      currentUrl: page.url(),
    },
  );
  await page.waitForTimeout(reservationsBeforeTypeMs);
}

async function humanDelay(page: Page, requestId: string, reason: string): Promise<void> {
  const { baseMs, jitterMs } = getHumanDelayConfig();
  const ms = Math.max(0, baseMs) + Math.floor(Math.random() * Math.max(0, jitterMs));

  logger.logInfo('Human delay before next action', 'CloudbedsReservationsFlow', 'humanDelay', requestId, {
    reason,
    ms,
  });
  await page.waitForTimeout(ms);
}

async function observePause(page: Page, requestId: string, reason: string): Promise<void> {
  const { observeMs } = getHumanDelayConfig();
  if (!observeMs || observeMs <= 0) return;

  logger.logInfo('Observability wait (so you can visually verify UI)', 'CloudbedsReservationsFlow', 'observePause', requestId, {
    reason,
    observeMs,
  });
  await page.waitForTimeout(observeMs);
}

async function clickReservationNameFromResults(page: Page, requestId: string, reservationId: string): Promise<void> {
  const resultsRow = page
    .getByRole('row', { name: new RegExp(reservationId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })
    .first();

  await resultsRow.waitFor({ state: 'visible', timeout: 60000 });

  const nameLink = resultsRow.getByRole('link').first();
  const nameText = (await nameLink.textContent().catch(() => null))?.trim() ?? null;
  const href = await nameLink.getAttribute('href').catch(() => null);

  logger.logInfo('Clicking reservation Name link from results', 'CloudbedsReservationsFlow', 'clickReservationNameFromResults', requestId, {
    reservationIdLength: reservationId.length,
    nameText,
    href,
  });

  await humanDelay(page, requestId, 'before-click-reservation-name');
  await Promise.all([
    page.waitForURL(/#\/reservations\/[0-9]+/, { timeout: 120000 }),
    nameLink.click(),
  ]);

  await observePause(page, requestId, 'after-reservation-details-load');
  logger.logInfo('Reservation details page opened', 'CloudbedsReservationsFlow', 'clickReservationNameFromResults', requestId, {
    currentUrl: page.url(),
  });
}

async function openCreditCardsTab(page: Page, requestId: string): Promise<void> {
  const creditCardsTab = page.getByRole('link', { name: 'Credit Cards' });
  const addCardButton = page.getByRole('button', { name: /add card/i });

  await creditCardsTab.waitFor({ state: 'visible', timeout: 60000 });

  logger.logInfo('Opening Credit Cards tab', 'CloudbedsReservationsFlow', 'openCreditCardsTab', requestId, {
    currentUrl: page.url(),
  });

  await humanDelay(page, requestId, 'before-click-credit-cards-tab');
  await creditCardsTab.click();

  await addCardButton.waitFor({ state: 'visible', timeout: 120000 });
  await observePause(page, requestId, 'after-credit-cards-tab-load');

  const { creditCardsWaitMs } = getHumanDelayConfig();
  if (creditCardsWaitMs > 0) {
    logger.logInfo('Waiting on Credit Cards tab for manual inspection', 'CloudbedsReservationsFlow', 'openCreditCardsTab', requestId, {
      creditCardsWaitMs,
      currentUrl: page.url(),
    });
    await page.waitForTimeout(creditCardsWaitMs);
  }

  logger.logInfo('Credit Cards tab opened', 'CloudbedsReservationsFlow', 'openCreditCardsTab', requestId, {
    currentUrl: page.url(),
  });
}

export async function openSideDrawerIfNeeded(page: Page, requestId: string): Promise<void> {
  const reservationsMenuItem = page.locator('[data-testid="menu-reservations"]');
  const reservationsLink = page.getByRole('link', { name: 'Reservations' });
  const reservationsMenuItemByRole = page.getByRole('menuitem', { name: 'Reservations' });
  const menuButton = page.locator('button[aria-label="Menu"]').first();

  logger.logInfo('Checking whether side drawer is already visible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId, {
    currentUrl: page.url(),
  });

  // Cloudbeds sometimes renders a pinned left sidebar (Reservations is a link)
  // and sometimes renders a menu drawer (Reservations is a menuitem w/ data-testid).
  if (await reservationsMenuItem.isVisible().catch(() => false)) {
    logger.logInfo('Side drawer already visible; Reservations link is accessible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  if (await reservationsLink.isVisible().catch(() => false)) {
    logger.logInfo('Pinned sidebar detected; Reservations link is visible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  if (await reservationsMenuItemByRole.isVisible().catch(() => false)) {
    logger.logInfo('Menu drawer detected; Reservations menuitem is visible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  // Give the UI a moment to finish hydrating before we decide it doesn't exist.
  await Promise.race([
    reservationsMenuItem.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    reservationsLink.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    reservationsMenuItemByRole.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
    menuButton.waitFor({ state: 'visible', timeout: 15000 }).catch(() => undefined),
  ]);

  if (await reservationsMenuItem.isVisible().catch(() => false)) {
    logger.logInfo('Side drawer became visible (data-testid menu-reservations)', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  if (await reservationsLink.isVisible().catch(() => false)) {
    logger.logInfo('Pinned sidebar became visible (Reservations link)', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  if (await reservationsMenuItemByRole.isVisible().catch(() => false)) {
    logger.logInfo('Menu drawer became visible (Reservations menuitem role)', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
    return;
  }

  const debugCounts = {
    reservationsMenuItemCount: await reservationsMenuItem.count().catch(() => -1),
    reservationsLinkCount: await reservationsLink.count().catch(() => -1),
    reservationsMenuItemByRoleCount: await reservationsMenuItemByRole.count().catch(() => -1),
    menuButtonCount: await menuButton.count().catch(() => -1),
  };

  const debugVisibility = {
    reservationsMenuItemVisible: await reservationsMenuItem.isVisible().catch(() => false),
    reservationsLinkVisible: await reservationsLink.isVisible().catch(() => false),
    reservationsMenuItemByRoleVisible: await reservationsMenuItemByRole.isVisible().catch(() => false),
    menuButtonVisible: await menuButton.isVisible().catch(() => false),
  };

  logger.logInfo('Navigation items not immediately visible; attempting to open menu', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId, {
    debugCounts,
    debugVisibility,
    currentUrl: page.url(),
  });

  if (!(await menuButton.isVisible().catch(() => false))) {
    logger.logError('Menu button with aria-label "Menu" not visible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', new Error('Menu button not found'), requestId, {
      currentUrl: page.url(),
      debugCounts,
      debugVisibility,
    });
    throw new Error('Unable to find the Cloudbeds menu button to open the side drawer.');
  }

  logger.logInfo('Clicking Cloudbeds menu button to open side drawer', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
  await humanDelay(page, requestId, 'before-click-menu-button');
  await menuButton.click();
  await Promise.race([
    reservationsMenuItem.waitFor({ state: 'visible', timeout: 30000 }),
    reservationsLink.waitFor({ state: 'visible', timeout: 30000 }),
    reservationsMenuItemByRole.waitFor({ state: 'visible', timeout: 30000 }),
  ]);
  logger.logInfo('Side drawer opened and Reservations entry became visible', 'CloudbedsReservationsFlow', 'openSideDrawerIfNeeded', requestId);
}

function getReservationsMenuItem(page: Page): Locator {
  // Prefer stable data-testid when present; fallback to role-based variants.
  return page
    .locator('[data-testid="menu-reservations"]')
    .or(page.getByRole('link', { name: 'Reservations' }))
    .or(page.getByRole('menuitem', { name: 'Reservations' }))
    .first();
}

function getReservationsSearchInput(page: Page): Locator {
  // IMPORTANT: This must be the Reservations page filter search (not the global top search bar).
  // MCP confirmed the correct input as:
  // - name="find_reservations"
  // - placeholder="Enter search terms"
  return page
    .locator('input[name="find_reservations"]')
    .or(page.locator('input.query_reservations'))
    .or(page.locator('input[placeholder="Enter search terms"]'))
    .first();
}

export async function goToReservationsAndSearch(page: Page, propertyId: string, reservationId: string): Promise<void> {
  const requestId = logger.generateRequestId();
  const normalizedPropertyId = normalizePropertyId(propertyId);

  logger.logInfo('Starting dashboard-to-reservations flow', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    propertyId,
    normalizedPropertyId,
    reservationIdLength: reservationId.length,
    currentUrl: page.url(),
  });

  await page.goto(buildDashboardUrl(normalizedPropertyId), {
    waitUntil: 'domcontentloaded',
  });

  logger.logInfo('Navigated to Cloudbeds dashboard', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    currentUrl: page.url(),
  });

  await expect(page).toHaveURL(buildDashboardUrl(normalizedPropertyId), {
    timeout: 120000,
  });

  await observePause(page, requestId, 'after-dashboard-load');

  await openSideDrawerIfNeeded(page, requestId);

  logger.logInfo('Clicking Reservations link in side drawer', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId);
  await humanDelay(page, requestId, 'before-click-reservations');
  await getReservationsMenuItem(page).click();

  await expect(page).toHaveURL(buildReservationsUrl(normalizedPropertyId), {
    timeout: 120000,
  });

  await observePause(page, requestId, 'after-reservations-load');

  logger.logInfo('Reservations page loaded successfully', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    currentUrl: page.url(),
  });

  const searchBox = getReservationsSearchInput(page);

  await expect(searchBox).toBeVisible({ timeout: 60000 });
  const searchMeta = {
    name: await searchBox.getAttribute('name').catch(() => null),
    id: await searchBox.getAttribute('id').catch(() => null),
    placeholder: await searchBox.getAttribute('placeholder').catch(() => null),
    class: await searchBox.getAttribute('class').catch(() => null),
  };
  logger.logInfo('Resolved Reservations page search input', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    searchMeta,
  });

  await waitBeforeTypingOnReservations(page, requestId);

  logger.logInfo('Reservation search input is visible; typing reservation id', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    reservationIdPreview: `${reservationId.slice(0, 2)}******${reservationId.slice(-2)}`,
  });
  await humanDelay(page, requestId, 'before-fill-reservation-search');
  await searchBox.fill(reservationId);

  const enteredValue = await searchBox.inputValue().catch(() => null);
  logger.logInfo('Reservation search value entered', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    enteredValueLength: enteredValue?.length ?? null,
  });

  await clickReservationNameFromResults(page, requestId, reservationId);

  await openCreditCardsTab(page, requestId);

  logger.logInfo('Completed dashboard-to-reservations search flow', 'CloudbedsReservationsFlow', 'goToReservationsAndSearch', requestId, {
    finalUrl: page.url(),
  });
}
