import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should display login form with all required elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Sign In to DokanOS');
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should show validation error on invalid credentials', async ({ page }) => {
    await page.fill('[data-testid="email-input"]', 'invalid@dokanos.dev');
    await page.fill('[data-testid="password-input"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');

    const errorAlert = page.locator('[data-testid="login-error-alert"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Invalid email or password');
  });

  test('should allow pre-filling credentials using quick demo buttons', async ({ page }) => {
    await page.click('[data-testid="fill-seller-btn"]');
    await expect(page.locator('[data-testid="email-input"]')).toHaveValue('seller@dokanos.dev');
    await expect(page.locator('[data-testid="password-input"]')).toHaveValue('Password123!');
  });

  test('should successfully log in as seller and redirect to seller dashboard', async ({
    page,
  }) => {
    await page.click('[data-testid="fill-seller-btn"]');
    await page.click('[data-testid="login-button"]');

    // Should display success notification
    await expect(page.locator('[data-testid="login-success-alert"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-success-alert"]')).toContainText(
      'Signed in successfully as SELLER',
    );

    // Should redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('should successfully log in as buyer and redirect to products catalog', async ({ page }) => {
    await page.click('[data-testid="fill-buyer-btn"]');
    await page.click('[data-testid="login-button"]');

    await expect(page.locator('[data-testid="login-success-alert"]')).toBeVisible();
    await page.waitForURL('**/products', { timeout: 10000 });
    expect(page.url()).toContain('/products');
  });
});
