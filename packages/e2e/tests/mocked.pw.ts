import { test } from '@playwright/test';
import { loginAs } from './fixtures';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test.describe('Mocked', () => {
  test.skip('wait', async ({ page }) => {
    await loginAs(page, 'testowner', 'password123');

    await sleep(9999999);
    await page.waitForTimeout(9999999);
  });
});
