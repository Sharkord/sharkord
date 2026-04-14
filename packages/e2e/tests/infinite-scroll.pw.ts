import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page
} from '@playwright/test';
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

const scrollToBottom = async (container: Locator) => {
  await container.evaluate((element) => {
    const target = element as {
      scrollTop: number;
      scrollHeight: number;
      dispatchEvent: (event: Event) => boolean;
    };

    target.scrollTop = target.scrollHeight;
    target.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
};

const scrollToTop = async (container: Locator) => {
  await container.evaluate((element) => {
    const target = element as {
      scrollTop: number;
      dispatchEvent: (event: Event) => boolean;
    };

    target.scrollTop = 0;
    target.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
};

const ensureAtBottom = async (container: Locator) => {
  await expect
    .poll(
      async () => {
        await scrollToBottom(container);

        return getDistanceFromBottom(container);
      },
      {
        timeout: 12000
      }
    )
    .toBeLessThanOrEqual(120);
};

const getComposeEditor = (page: Page) =>
  page.locator('.tiptap .ProseMirror').first();

const sendMessage = async (page: Page, content: string) => {
  const composeEditor = getComposeEditor(page);

  await expect(composeEditor).toBeVisible();
  await composeEditor.click();
  await composeEditor.fill(content);
  await composeEditor.press('Enter');
};

const getScrollHeight = async (container: Locator) =>
  container.evaluate((element) => {
    const target = element as { scrollHeight: number };

    return target.scrollHeight;
  });

const openInfiniteScrollChannel = async (page: Page) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: 'Infinite Scroll' })
    .click({ force: true });

  await expect(page.locator('[data-messages-container]')).toBeVisible();
};

const closeContextSafe = async (pageContext: BrowserContext) => {
  try {
    await pageContext.close();
  } catch {
    // ignore - context may already be closed after timeout/interruption
  }
};

test.describe('Infinite Scroll', () => {
  test('should fetch older messages on upward scroll and keep them ordered', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);
    const messagesContainer = page.locator('[data-messages-container]');

    await expect(messages.first()).toBeVisible();

    await ensureAtBottom(messagesContainer);

    const initialNumbers = await getMessageNumbers(messages.allTextContents());
    const initialMin =
      initialNumbers.length > 0 ? Math.min(...initialNumbers) : 1001;
    const initialMax =
      initialNumbers.length > 0 ? Math.max(...initialNumbers) : undefined;

    if (initialMax !== undefined) {
      expect(initialMax).toBeGreaterThanOrEqual(1000);
    }

    await expect
      .poll(
        async () => {
          await scrollToTop(messagesContainer);

          const numbers = await getMessageNumbers(messages.allTextContents());

          if (numbers.length === 0) {
            return null;
          }

          return Math.min(...numbers);
        },
        {
          timeout: 12000
        }
      )
      .toBeLessThan(initialMin);

    const messagesAfterScroll = await getMessageNumbers(
      messages.allTextContents()
    );

    expect(messagesAfterScroll.length).toBeGreaterThan(0);

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

    await ensureAtBottom(messagesContainer);

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

  test('should keep user at bottom when sending own message at bottom', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messagesContainer = page.locator('[data-messages-container]');
    const messageContent = `Playwright own message bottom ${Date.now()}`;

    await expect(messagesContainer).toBeVisible();

    await ensureAtBottom(messagesContainer);

    await sendMessage(page, messageContent);

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer), {
        timeout: 12000
      })
      .toBeLessThanOrEqual(120);
  });

  test('should not jump to bottom when sending own message while scrolled up', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messagesContainer = page.locator('[data-messages-container]');
    const messageContent = `Playwright own message up ${Date.now()}`;

    await expect(messagesContainer).toBeVisible();

    await ensureAtBottom(messagesContainer);

    await messagesContainer.hover();
    await scrollToTop(messagesContainer);

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer), {
        timeout: 12000
      })
      .toBeGreaterThan(180);

    await sendMessage(page, messageContent);

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer), {
        timeout: 12000
      })
      .toBeGreaterThan(180);
  });

  test('should keep receiver at bottom when another user sends a message', async ({
    page,
    browser
  }) => {
    test.setTimeout(60_000);

    await loginAs(page, 'testowner', 'password123');
    await openInfiniteScrollChannel(page);

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();

    try {
      await loginAs(userBPage, 'testuser', 'password123');
      await openInfiniteScrollChannel(userBPage);

      const userAMessagesContainer = page.locator('[data-messages-container]');
      const messageContent = `Playwright incoming bottom ${Date.now()}`;

      await expect(userAMessagesContainer).toBeVisible();

      await ensureAtBottom(userAMessagesContainer);

      const previousScrollHeight = await getScrollHeight(
        userAMessagesContainer
      );

      await sendMessage(userBPage, messageContent);
      await expect(userBPage.getByText(messageContent)).toBeVisible();

      await expect
        .poll(() => getScrollHeight(userAMessagesContainer), {
          timeout: 12000
        })
        .toBeGreaterThan(previousScrollHeight);

      await expect
        .poll(() => getDistanceFromBottom(userAMessagesContainer), {
          timeout: 12000
        })
        .toBeLessThanOrEqual(120);
    } finally {
      await closeContextSafe(userBContext);
    }
  });

  test('should not jump receiver to bottom when another user sends while receiver is scrolled up', async ({
    page,
    browser
  }) => {
    test.setTimeout(60_000);

    await loginAs(page, 'testowner', 'password123');
    await openInfiniteScrollChannel(page);

    const userBContext = await browser.newContext();
    const userBPage = await userBContext.newPage();

    try {
      await loginAs(userBPage, 'testuser', 'password123');
      await openInfiniteScrollChannel(userBPage);

      const userAMessagesContainer = page.locator('[data-messages-container]');
      const messageContent = `Playwright incoming up ${Date.now()}`;

      await expect(userAMessagesContainer).toBeVisible();

      await ensureAtBottom(userAMessagesContainer);

      await userAMessagesContainer.hover();
      await scrollToTop(userAMessagesContainer);

      await expect
        .poll(() => getDistanceFromBottom(userAMessagesContainer), {
          timeout: 12000
        })
        .toBeGreaterThan(180);

      const previousScrollHeight = await getScrollHeight(
        userAMessagesContainer
      );

      await sendMessage(userBPage, messageContent);
      await expect(userBPage.getByText(messageContent)).toBeVisible();

      await expect
        .poll(() => getScrollHeight(userAMessagesContainer), {
          timeout: 12000
        })
        .toBeGreaterThan(previousScrollHeight);

      await expect
        .poll(() => getDistanceFromBottom(userAMessagesContainer), {
          timeout: 12000
        })
        .toBeGreaterThan(180);
    } finally {
      await closeContextSafe(userBContext);
    }
  });
});
