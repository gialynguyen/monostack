import { expect, test } from '@playwright/test';

test('should have the correct title', async ({ page, baseURL }) => {
  await page.goto(baseURL || '');
  const button = page.locator('#btn');

  expect(button).toBeDefined();

  await expect(button).toHaveText('count is 0');

  await button.click();
  await expect(button).toHaveText('count is 1');
});
