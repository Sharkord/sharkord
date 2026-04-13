import { expect, test } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { loginAs } from './fixtures';

test.describe.configure({ mode: 'serial' });

test.describe('Messages Render', () => {
  test('should render messages correctly with large content', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await page
      .getByTestId(TestId.CHANNEL_ITEM)
      .filter({ hasText: 'Messages Render' })
      .click();

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);

    await expect(messages.first()).toBeVisible();

    await expect
      .poll(() => messages.count(), {
        timeout: 6000
      })
      .toBeGreaterThanOrEqual(5);
  });
});
