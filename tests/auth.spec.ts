import { test, expect } from '@playwright/test';

test('app loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).not.toBeEmpty();
});

test('login page reachable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('button:has-text("Login with Google")')).toBeVisible({ timeout: 5000 });
});
