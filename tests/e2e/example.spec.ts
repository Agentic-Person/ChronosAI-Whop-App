import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await page.goto('/');

    // Check for main heading
    await expect(page.locator('h1')).toContainText('Mentora');
  });

  test('should have Get Started button', async ({ page }) => {
    await page.goto('/');

    const getStartedButton = page.getByRole('link', { name: /get started/i });
    await expect(getStartedButton).toBeVisible();
  });
});

// TODO: Add E2E tests for:
// - Student onboarding flow
// - Video watching and progress tracking
// - Chat interaction
// - Quiz taking
// - Creator dashboard
