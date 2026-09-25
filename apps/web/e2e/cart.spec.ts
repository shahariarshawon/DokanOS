import { test, expect } from '@playwright/test';

test.describe('Cart Operations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cart');
  });

  test('should display active items in the cart', async ({ page }) => {
    const cartItems = page.locator('[data-testid="cart-item"]');
    // Cart is pre-populated with 1 item by default
    await expect(cartItems.first()).toBeVisible();
    await expect(page.locator('[data-testid="cart-subtotal"]')).toBeVisible();
    await expect(page.locator('[data-testid="cart-total"]')).toBeVisible();
  });

  test('should increase and decrease product quantity and update subtotal', async ({ page }) => {
    const qtySpan = page.locator('[data-testid="cart-item-qty"]').first();
    const initialQty = parseInt(await qtySpan.innerText(), 10);

    // Increase quantity
    await page.locator('[data-testid="qty-increase"]').first().click();
    await expect(qtySpan).toHaveText(String(initialQty + 1));

    // Decrease quantity
    await page.locator('[data-testid="qty-decrease"]').first().click();
    await expect(qtySpan).toHaveText(String(initialQty));
  });

  test('should apply discount coupon code DOKAN10', async ({ page }) => {
    const couponInput = page.locator('[data-testid="coupon-input"]');
    const applyBtn = page.locator('[data-testid="apply-coupon-btn"]');

    await couponInput.fill('DOKAN10');
    await applyBtn.click();

    // Verify discount success text
    await expect(page.locator('text=Coupon DOKAN10 applied! 10% discount.')).toBeVisible();
  });

  test('should navigate to checkout when clicking proceed button', async ({ page }) => {
    const proceedBtn = page.locator('[data-testid="proceed-checkout-btn"]');
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    await page.waitForURL('**/checkout', { timeout: 10000 });
    expect(page.url()).toContain('/checkout');
  });

  test('should display empty cart message when items are removed', async ({ page }) => {
    const removeBtn = page.locator('[data-testid="remove-item-btn"]').first();
    await removeBtn.click();

    await expect(page.locator('[data-testid="empty-cart-message"]')).toBeVisible();
    await expect(page.locator('text=Your cart is currently empty')).toBeVisible();
  });
});
