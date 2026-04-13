import { expect, test } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { loginAs } from './fixtures';

const getMessageNumbers = async (
  messageTexts: Promise<string[]>
): Promise<number[]> => {
  return (await messageTexts).map((text) => {
    const match = text.match(/Mock message (\d+)/);

    if (!match) {
      throw new Error(`Could not find mock message number in: ${text}`);
    }

    return Number(match[1]);
  });
};

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

    await expect(messages).toHaveCount(100);

    const initialNumbers = await getMessageNumbers(messages.allTextContents());

    expect(initialNumbers).toEqual(
      Array.from({ length: 100 }, (_, index) => index + 901)
    );

    await messagesContainer.hover();
    await page.mouse.wheel(0, -10_000);

    await expect(messages).toHaveCount(200);

    const messagesAfterScroll = await getMessageNumbers(
      messages.allTextContents()
    );

    expect(messagesAfterScroll).toEqual(
      Array.from({ length: 200 }, (_, index) => index + 801)
    );
  });
});
