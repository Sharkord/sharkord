import { test } from '@playwright/test';
import { loginAs } from './fixtures';
import { sleep } from './helpers';

// run this with bun test:mocked
// use this to navigate freely in the server from the browser and inspect the behavior with mocked data, without worrying about the test timing out

test.describe('Mocked', () => {
  test('wait', async ({ page }) => {
    test.skip(
      !process.env.RUN_MOCK,
      'exploration harness, set RUN_MOCK to use it'
    );

    await loginAs(page, 'testowner', 'password123');

    test.setTimeout(9999999);
    page.setDefaultTimeout(9999999);
    await sleep(9999999);
    await page.waitForTimeout(9999999);
  });
});
