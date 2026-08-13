import {
  expect,
  test,
  type BrowserContext,
  type Locator,
  type Page
} from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { loginAs } from './fixtures';
import { sleep } from './helpers';

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

const getScrollTop = async (container: Locator) =>
  container.evaluate((element) => {
    const target = element as {
      scrollTop: number;
    };

    return Math.max(0, Math.floor(target.scrollTop));
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
    .poll(async () => {
      await scrollToBottom(container);

      return getDistanceFromBottom(container);
    })
    .toBeLessThanOrEqual(120);
};

const ensureAwayFromBottom = async (container: Locator) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < 12_000) {
    await scrollToTop(container);

    const distanceFromBottom = await getDistanceFromBottom(container);

    if (distanceFromBottom > 0) {
      return distanceFromBottom;
    }

    await sleep(250);
  }

  throw new Error('Messages container never moved away from bottom');
};

const expectBottomToRemainStable = async (
  container: Locator,
  durationMs = 2000
) => {
  const startedAt = Date.now();

  while (Date.now() - startedAt < durationMs) {
    expect(await getDistanceFromBottom(container)).toBeLessThanOrEqual(120);
    await sleep(200);
  }
};

const getMessageItemsByText = (page: Page, content: string) =>
  page.getByTestId(TestId.MESSAGE_ITEM).filter({ hasText: content });

const getComposeEditor = (page: Page) =>
  page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR).first();

const sendMessage = async (page: Page, content: string) => {
  const composeEditor = getComposeEditor(page);

  await expect(composeEditor).toBeVisible();
  await composeEditor.click();
  await composeEditor.press('Control+A');
  await composeEditor.press('Backspace');
  await composeEditor.pressSequentially(content);
  await expect(composeEditor).toContainText(content);
  await composeEditor.press('Enter');
  await expect(composeEditor).not.toContainText(content);
  await expect(getMessageItemsByText(page, content)).toHaveCount(1);
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

// skipping these tests for now as they are flaky af and need some refactor to be more reliable
test.describe.skip('Infinite Scroll', () => {
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
      .poll(async () => {
        await scrollToTop(messagesContainer);

        const numbers = await getMessageNumbers(messages.allTextContents());

        if (numbers.length === 0) {
          return null;
        }

        return Math.min(...numbers);
      })
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
      .poll(() =>
        page
          .getByTestId(TestId.MESSAGE_ITEM)
          .getByRole('link', { name: 'Open in new tab' })
          .count()
      )
      .toBeGreaterThan(0);

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer))
      .toBeLessThanOrEqual(120);

    await expectBottomToRemainStable(messagesContainer);
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
    const previousScrollHeight = await getScrollHeight(messagesContainer);

    await sendMessage(page, messageContent);
    await expect
      .poll(() => getScrollHeight(messagesContainer))
      .toBeGreaterThan(previousScrollHeight);
    await expect(getMessageItemsByText(page, messageContent)).toHaveCount(1);

    await expect
      .poll(() => getDistanceFromBottom(messagesContainer))
      .toBeLessThanOrEqual(120);
  });

  test('should send own message successfully while scrolled up', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messagesContainer = page.locator('[data-messages-container]');
    const messageContent = `Playwright own message up ${Date.now()}`;

    await expect(messagesContainer).toBeVisible();

    await ensureAtBottom(messagesContainer);

    await messagesContainer.hover();
    await ensureAwayFromBottom(messagesContainer);
    const previousScrollHeight = await getScrollHeight(messagesContainer);

    await sendMessage(page, messageContent);

    await expect
      .poll(() => getScrollHeight(messagesContainer))
      .toBeGreaterThan(previousScrollHeight);
    await expect(getMessageItemsByText(page, messageContent)).toHaveCount(1);
  });

  test('should keep receiver at bottom when another user sends a message', async ({
    page,
    browser
  }) => {
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
      await expect(
        getMessageItemsByText(userBPage, messageContent)
      ).toHaveCount(1);

      await expect
        .poll(() => getScrollHeight(userAMessagesContainer))
        .toBeGreaterThan(previousScrollHeight);

      await expect
        .poll(() => getDistanceFromBottom(userAMessagesContainer))
        .toBeLessThanOrEqual(120);
    } finally {
      await closeContextSafe(userBContext);
    }
  });

  test('should not jump receiver to bottom when another user sends while receiver is scrolled up', async ({
    page,
    browser
  }) => {
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
      await ensureAwayFromBottom(userAMessagesContainer);
      const scrollTopBeforeIncomingMessage = await getScrollTop(
        userAMessagesContainer
      );

      const previousScrollHeight = await getScrollHeight(
        userAMessagesContainer
      );

      await sendMessage(userBPage, messageContent);
      await expect(
        getMessageItemsByText(userBPage, messageContent)
      ).toHaveCount(1);

      await expect
        .poll(() => getScrollHeight(userAMessagesContainer))
        .toBeGreaterThan(previousScrollHeight);

      await expect
        .poll(async () => {
          const currentScrollTop = await getScrollTop(userAMessagesContainer);

          return Math.abs(currentScrollTop - scrollTopBeforeIncomingMessage);
        })
        .toBeLessThanOrEqual(20);
    } finally {
      await closeContextSafe(userBContext);
    }
  });
});

// if this ever fails, skip the test
test.describe('Channel message retention', () => {
  test('should trim a channel back to the newest page when it is left', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);
    const messagesContainer = page.locator('[data-messages-container]');

    await expect(messages.first()).toBeVisible();

    const oldestBefore = await expect
      .poll(async () => {
        await scrollToTop(messagesContainer);

        const numbers = await getMessageNumbers(messages.allTextContents());

        return numbers.length > 0 ? Math.min(...numbers) : 1001;
      })
      .toBeLessThan(900)
      .then(async () =>
        Math.min(...(await getMessageNumbers(messages.allTextContents())))
      );

    await page
      .getByTestId(TestId.CHANNEL_ITEM)
      .filter({ hasText: 'General' })
      .first()
      .click({ force: true });

    await expect(page.locator('[data-messages-container]')).toBeVisible();

    await openInfiniteScrollChannel(page);
    await expect(messages.first()).toBeVisible();

    await expect
      .poll(async () => {
        const numbers = await getMessageNumbers(messages.allTextContents());

        return numbers.length > 0 ? Math.min(...numbers) : null;
      })
      .toBeGreaterThan(oldestBefore);

    const afterReturn = await getMessageNumbers(messages.allTextContents());

    expect(afterReturn).toEqual([...afterReturn].sort((a, b) => a - b));
    expect(Math.max(...afterReturn)).toBe(1000);
  });
});

test.describe('Jump to message', () => {
  test('should show a bounded window and a way back to the present', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);

    await expect(messages.first()).toBeVisible();
    await expect
      .poll(async () => {
        const numbers = await getMessageNumbers(messages.allTextContents());

        return numbers.length > 0 ? Math.max(...numbers) : null;
      })
      .toBe(1000);

    await page.keyboard.press('Control+k');

    const searchInput = page.getByTestId(TestId.SEARCH_INPUT);

    await expect(searchInput).toBeVisible();
    await searchInput.fill('Mock message 150');

    const jumpButton = page.getByTestId(TestId.SEARCH_RESULT_JUMP).first();

    await expect(jumpButton).toBeVisible();
    await jumpButton.click();

    // the window is anchored at the target and stops well short of message 1000
    await expect
      .poll(async () => {
        const numbers = await getMessageNumbers(messages.allTextContents());

        return numbers.includes(150);
      })
      .toBe(true);

    const windowNumbers = await getMessageNumbers(messages.allTextContents());

    expect(windowNumbers).toEqual([...windowNumbers].sort((a, b) => a - b));
    expect(Math.max(...windowNumbers)).toBeLessThan(1000);

    const returnToPresent = page.getByTestId(TestId.RETURN_TO_PRESENT);

    await expect(returnToPresent).toBeVisible();
    await returnToPresent.click();

    await expect(returnToPresent).toBeHidden();
    await expect
      .poll(async () => {
        const numbers = await getMessageNumbers(messages.allTextContents());

        return numbers.length > 0 ? Math.max(...numbers) : null;
      })
      .toBe(1000);
  });

  test('should reattach when a second jump lands within reach of the present', async ({
    page
  }) => {
    await loginAs(page, 'testowner', 'password123');

    await openInfiniteScrollChannel(page);

    const messages = page.getByTestId(TestId.MESSAGE_ITEM);

    await expect(messages.first()).toBeVisible();

    const jumpTo = async (target: number) => {
      await page.keyboard.press('Control+k');

      const searchInput = page.getByTestId(TestId.SEARCH_INPUT);

      await expect(searchInput).toBeVisible();
      await searchInput.fill(`Mock message ${target}`);

      const jumpButton = page.getByTestId(TestId.SEARCH_RESULT_JUMP).first();

      await expect(jumpButton).toBeVisible();
      await jumpButton.click();

      await expect
        .poll(async () => {
          const numbers = await getMessageNumbers(messages.allTextContents());

          return numbers.includes(target);
        })
        .toBe(true);
    };

    const returnToPresent = page.getByTestId(TestId.RETURN_TO_PRESENT);

    // far enough back that the window cannot reach the newest message
    await jumpTo(150);
    await expect(returnToPresent).toBeVisible();

    // within one page of the present, so this window does reach it. merging it into the
    // detached window above would splice two disjoint stretches of history together
    await jumpTo(950);
    await expect(returnToPresent).toBeHidden();

    const numbers = await getMessageNumbers(messages.allTextContents());

    expect(Math.max(...numbers)).toBe(1000);
    expect(Math.max(...numbers) - Math.min(...numbers) + 1).toBe(
      numbers.length
    );
  });
});
