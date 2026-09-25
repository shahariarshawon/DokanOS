import { test, expect } from '@playwright/test';

test.describe('Product Browsing & Discovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/products');
  });

  test('should render catalog header and product grid', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Curated Electronics & Workspace Hardware');
    const products = page.locator('[data-testid="product-card"]');
    await expect(products).toHaveCount(6);
  });

  test('should filter products by category', async ({ page }) => {
    // Click 'Audio' category button
    await page.click('[data-testid="category-filter-btn-audio"]');

    // Should only show audio items (Sony WH-1000XM5)
    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount(1);
    await expect(page.locator('[data-testid="product-title"]')).toContainText('Sony WH-1000XM5');
  });

  test('should search products dynamically by title or keyword', async ({ page }) => {
    const searchInput = page.locator('[data-testid="product-search-input"]');
    await searchInput.fill('MacBook');

    const productCards = page.locator('[data-testid="product-card"]');
    await expect(productCards).toHaveCount(1);
    await expect(page.locator('[data-testid="product-title"]')).toContainText(
      'MacBook Pro 16" M3 Max',
    );
    await expect(page.locator('[data-testid="product-price"]')).toContainText('$3,499.00');
  });

  test('should add an item to the shopping cart and update cart badge', async ({ page }) => {
    // Get initial cart count from badge
    const badge = page.locator('[data-testid="cart-count-badge"]');
    const initialText = await badge.innerText();
    const initialCount = parseInt(initialText, 10) || 0;

    // Click "Add to Cart" on first product
    const addButtons = page.locator('[data-testid="add-to-cart-btn"]');
    await addButtons.first().click();

    // Verify toast notification appears
    const toast = page.locator('[data-testid="cart-toast"]');
    await expect(toast).toBeVisible();

    // Verify badge incremented
    await expect(badge).toHaveText(String(initialCount + 1));
  });
});
