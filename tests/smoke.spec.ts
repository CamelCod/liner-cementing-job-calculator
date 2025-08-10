import { test, expect } from '@playwright/test';

// Basic smoke test: app loads, has title and key controls
test('app loads and shows core UI', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveTitle(/Liner Cementing Job Calculator|Drilling App|Vite App/i);

  await expect(page.getByRole('button', { name: /Run Calculation/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Well Config/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Fluid Inputs/i })).toBeVisible();
});

// Calculation flow smoke
test('run calculation switches to results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Run Calculation/i }).click();
  await expect(page.getByText(/Calculation Results/i)).toBeVisible();
});
