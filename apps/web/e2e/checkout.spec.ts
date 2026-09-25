import { test, expect } from '@playwright/test';

test.describe('Checkout & Order Placement Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/checkout');
  });

  test('should display shipping address fields and payment options', async ({ page }) => {
    await expect(page.locator('h1, span')).toContainText(['Secure Checkout', 'DokanOS Checkout']);
    await expect(page.locator('[data-testid="shipping-name"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipping-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipping-address"]')).toBeVisible();
    await expect(page.locator('[data-testid="shipping-city"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-stripe"]')).toBeVisible();
    await expect(page.locator('[data-testid="payment-cod"]')).toBeVisible();
    await expect(page.locator('[data-testid="place-order-btn"]')).toBeVisible();
  });

  test('should allow changing payment method to Cash on Delivery', async ({ page }) => {
    const codRadio = page.locator('[data-testid="payment-cod"]');
    await codRadio.click();
    await expect(codRadio).toBeChecked();
  });

  test('should successfully complete checkout and render order confirmation with generated ID', async ({
    page,
  }) => {
    // Fill required details if needed
    await page.fill('[data-testid="shipping-name"]', 'David Warner');
    await page.fill('[data-testid="shipping-email"]', 'david@example.com');
    await page.fill('[data-testid="shipping-address"]', '123 Market Street, Suite 400');
    await page.fill('[data-testid="shipping-city"]', 'San Francisco');
    await page.fill('[data-testid="shipping-zip"]', '94105');

    // Submit order
    const placeOrderBtn = page.locator('[data-testid="place-order-btn"]');
    await placeOrderBtn.click();

    // Verify order confirmation receipt appears
    const confirmation = page.locator('[data-testid="order-confirmation"]');
    await expect(confirmation).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Order Placed Successfully!')).toBeVisible();

    // Verify generated order ID is displayed
    const orderIdDisplay = page.locator('[data-testid="order-id-display"]');
    await expect(orderIdDisplay).toBeVisible();
    const orderId = await orderIdDisplay.innerText();
    expect(orderId).toMatch(/^DKN-\d+/);

    // Verify return button exists
    const backBtn = page.locator('[data-testid="back-to-store-btn"]');
    await expect(backBtn).toBeVisible();
  });
});
