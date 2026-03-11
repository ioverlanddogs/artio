import { expect, test, type Page } from '@playwright/test';

async function gotoAndWait(page: Page, path: string) {
  const response = await page.goto(path);
  await page.waitForLoadState('networkidle');
  return response;
}

test.describe('Public discovery', () => {
  test('Homepage', async ({ page }) => {
    const response = await gotoAndWait(page, '/');
    expect(response?.status()).toBe(200);

    const heading = page.locator('main h1, h1').first();
    await expect(heading).toBeVisible();

    const eventCard = page.locator('a[href*="/events/"]').first();
    await expect(eventCard).toBeVisible();
  });

  test('Events list (/events)', async ({ page }) => {
    const response = await gotoAndWait(page, '/events');
    expect(response?.status()).toBe(200);

    const eventCard = page.locator('a[href*="/events/"]').first();
    await expect(eventCard).toBeVisible();

    const startDateInput = page.locator('input[type="date"]').nth(0);
    const endDateInput = page.locator('input[type="date"]').nth(1);

    if (await startDateInput.isVisible().catch(() => false)) {
      await startDateInput.fill('2024-01-01');
    }

    if (await endDateInput.isVisible().catch(() => false)) {
      await endDateInput.fill('2030-12-31');
    }

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/events/);

    await eventCard.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/events\/[\w-]+/);
  });

  test('Event detail (/events/[slug])', async ({ page }) => {
    await gotoAndWait(page, '/events');

    const eventCard = page.locator('a[href*="/events/"]').first();
    await expect(eventCard).toBeVisible();
    await eventCard.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/events\/[\w-]+/);

    await expect(page.locator('main h1, h1').first()).toBeVisible();

    const pageText = page.locator('main, body');
    await expect(pageText).toContainText(
      /(am|pm|\d{1,2}:\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
    );
    await expect(pageText).toContainText(/venue|location/i);
  });

  test('Venues list (/venues)', async ({ page }) => {
    const response = await gotoAndWait(page, '/venues');
    expect(response?.status()).toBe(200);

    const venueCard = page.locator('a[href*="/venues/"]').first();
    await expect(venueCard).toBeVisible();

    await venueCard.click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/venues\/[\w-]+/);
  });

  test('Venue detail (/venues/[slug])', async ({ page }) => {
    await gotoAndWait(page, '/venues');

    const venueCard = page.locator('a[href*="/venues/"]').first();
    await expect(venueCard).toBeVisible();
    await venueCard.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/venues\/[\w-]+/);
    await expect(page.locator('main h1, h1').first()).toBeVisible();

    const pageText = page.locator('main, body');
    await expect(pageText).toContainText(/address|city|street|\d{5}/i);
  });

  test('Artists list (/artists)', async ({ page }) => {
    const response = await gotoAndWait(page, '/artists');
    expect(response?.status()).toBe(200);

    const artistCard = page.locator('a[href*="/artists/"]').first();
    await expect(artistCard).toBeVisible();
  });

  test('Artist detail (/artists/[slug])', async ({ page }) => {
    await gotoAndWait(page, '/artists');

    const artistCard = page.locator('a[href*="/artists/"]').first();
    await expect(artistCard).toBeVisible();
    await artistCard.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/artists\/[\w-]+/);
    await expect(page.locator('main h1, h1').first()).toBeVisible();
  });

  test('Search (/search)', async ({ page }) => {
    const response = await gotoAndWait(page, '/search');
    expect(response?.status()).toBe(200);

    const searchInput = page
      .locator('input[type="search"], input[name*="search" i], input[placeholder*="search" i]')
      .first();
    await expect(searchInput).toBeVisible();
    await searchInput.fill('art');
    await searchInput.press('Enter');

    await page.waitForLoadState('networkidle');

    const possibleError = page.locator('text=/error|something went wrong|exception/i').first();
    await expect(possibleError).toHaveCount(0);

    const resultsContainer = page
      .locator(
        '[data-testid="search-results"], [role="main"], main, section:has(a[href*="/events/"]), section:has(a[href*="/artists/"])',
      )
      .first();
    await expect(resultsContainer).toBeVisible();
  });

  test('Calendar (/calendar)', async ({ page }) => {
    const response = await gotoAndWait(page, '/calendar');
    expect(response?.status()).toBe(200);

    const calendar = page.locator('[data-testid="calendar"], .fc').first();
    await expect(calendar).toBeVisible();
  });

  test('Nearby (/nearby)', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const response = await gotoAndWait(page, '/nearby');
    expect(response?.status()).toBe(200);
    expect(pageErrors, `Unexpected page errors: ${pageErrors.join('\n')}`).toEqual([]);

    const mapOrList = page
      .locator('[data-testid="map"], #map, .mapboxgl-map, [data-testid="nearby-list"], a[href*="/events/"]')
      .first();
    await expect(mapOrList).toBeVisible();
  });
});
