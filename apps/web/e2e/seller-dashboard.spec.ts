import { test, expect } from '@playwright/test';

test.describe('Seller & Admin Business Intelligence Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display seller dashboard with core metrics cards', async ({ page }) => {
    // Seller view is loaded by default
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Validate 4 top metric cards
    await expect(page.locator('[data-testid="metric-total-sales"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-net-revenue"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-orders-count"]')).toBeVisible();
    await expect(page.locator('[data-testid="metric-conversion-rate"]')).toBeVisible();

    // Verify non-empty metric numbers
    const salesText = await page.locator('[data-testid="metric-total-sales-value"]').innerText();
    expect(salesText).toMatch(/^\$[\d,]+(\.\d{2})?$/);
  });

  test('should allow switching between Seller and Admin intelligence tabs', async ({ page }) => {
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Switch to Admin Intelligence tab
    const adminTab = page.locator('[data-testid="tab-admin-dashboard"]');
    await adminTab.click();

    // Verify Admin Intelligence header and metrics render
    await expect(page.locator('text=Gross Marketplace Volume (GMV)')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('text=Platform Take Rate')).toBeVisible();

    // Switch back to Seller Dashboard
    const sellerTab = page.locator('[data-testid="tab-seller-dashboard"]');
    await sellerTab.click();
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible();
  });

  test('should change date filter range (7d, 30d, 90d, 1y)', async ({ page }) => {
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible({ timeout: 15000 });

    // Click 7 Days filter
    await page.click('button:has-text("7 Days")');
    // Verify it triggers reload and remains visible
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible();

    // Click 90 Days filter
    await page.click('button:has-text("90 Days")');
    await expect(page.locator('[data-testid="seller-dashboard"]')).toBeVisible();
  });
});
