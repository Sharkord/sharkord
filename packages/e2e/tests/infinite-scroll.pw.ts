import { expect, test, type Locator } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { loginAs } from './fixtures';

test.describe.configure({ mode: 'serial' });

const getMessageNumbers = async (
  messageTexts: Promise<string[]>
): Promise<number[]> => {
  const numbers = (await messageTexts)
    .map((text) => {
      const match = text.match(/Mock message (\d+)/);

      if (!match) {
        return null;
      }

      return Number(match[1]);
    })
    .filter((value) => value !== null);

  if (numbers.length === 0) {
    throw new Error('No mock message numbers found in visible messages');
  }

  return numbers;
};

const getDistanceFromBottom = async (container: Locator) =>
  container.evaluate((element) => {
    const target = element as {
      scrollHeight: number;
      scrollTop: number;
      clientHeight: number;
    };

    const distance =
      target.scrollHeight - (target.scrollTop + target.clientHeight);

    return Math.max(0, Math.floor(distance));
  });

test.describe('Infinite Scroll', () => {
  test('should fetch older messages on upward scroll and keep them ordered', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await page
      .getByTestId(TestId.CHANNEL_ITEM)
      .filter({ hasText: 'Infinite Scroll' })
      .click();

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);
    const messagesContainer = page.locator('[data-messages-container]');

    await expect(messages.first()).toBeVisible();

    await expect
      .poll(async () => {
        const initialNumbers = await getMessageNumbers(
          messages.allTextContents()
        );

        return {
          min: Math.min(...initialNumbers),
          max: Math.max(...initialNumbers)
        };
      })
      .toMatchObject({ max: 1000 });

    await expect
      .poll(async () => {
        const initialNumbers = await getMessageNumbers(
          messages.allTextContents()
        );

        return Math.min(...initialNumbers);
      })
      .toBeGreaterThanOrEqual(901);

    await messagesContainer.hover();
    await page.mouse.wheel(0, -10_000);

    await expect
      .poll(async () => {
        const numbers = await getMessageNumbers(messages.allTextContents());

        return Math.min(...numbers);
      })
      .toBeLessThanOrEqual(900);

    const messagesAfterScroll = await getMessageNumbers(
      messages.allTextContents()
    );
    const sortedMessagesAfterScroll = [...messagesAfterScroll].sort(
      (a, b) => a - b
    );

    expect(messagesAfterScroll).toEqual(sortedMessagesAfterScroll);
  });

  test('should open image-heavy channel at the bottom', async ({ page }) => {
    await loginAs(page, 'testowner', 'password123');

    await page
      .getByTestId(TestId.CHANNEL_ITEM)
      .filter({ hasText: 'Messages Render' })
      .click();

    const messagesContainer = page.locator('[data-messages-container]');

    await expect(messagesContainer).toBeVisible();

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer), {
        timeout: 12000
      })
      .toBeLessThanOrEqual(120);

    await expect
      .poll(() => messagesContainer.locator('img').count(), {
        timeout: 6000
      })
      .toBeGreaterThan(0);

    await page.waitForTimeout(1500);

    await expect(
      getDistanceFromBottom(messagesContainer)
    ).resolves.toBeLessThanOrEqual(120);
  });
});
