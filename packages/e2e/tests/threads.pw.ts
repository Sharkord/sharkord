import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { withClients } from './helpers/clients';
import { confirmDialog } from './helpers/dialogs';
import { messageByText, sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

const threadView = (page: Page) => page.getByTestId(TestId.THREAD_VIEW);

const threadsToggle = (page: Page) => page.getByTestId(TestId.THREADS_TOGGLE);

const replyInThread = async (page: Page, parentText: string) => {
  const parent = messageByText(page, parentText);

  await parent.hover();
  await parent.getByTestId(TestId.MESSAGE_REPLY_IN_THREAD).click();
  await expect(threadView(page)).toBeVisible();
};

test('a reply lands unread in the parent author threads list and opens full screen', async ({
  browser
}) => {
  const parentText = `thread parent ${RUN_ID}`;
  const replyText = `thread reply ${RUN_ID}`;

  await withClients(
    browser,
    ['testowner', 'usere'],
    async ([author, replier]) => {
      await openChannel(author!, LIVE_MESSAGES_CHANNEL);
      await sendMessage(author!, parentText);

      await openChannel(replier!, LIVE_MESSAGES_CHANNEL);
      await replyInThread(replier!, parentText);
      await sendMessage(threadView(replier!), replyText);

      await expect(
        threadsToggle(author!).getByTestId(TestId.UNREAD_COUNT)
      ).toBeVisible();

      await threadsToggle(author!).click();

      const thread = author!
        .getByTestId(TestId.THREAD_ITEM)
        .filter({ hasText: parentText });

      await expect(thread.getByTestId(TestId.UNREAD_COUNT)).toBeVisible();

      await thread.click();

      await expect(threadView(author!)).toHaveCount(1);
      await expect(messageByText(threadView(author!), replyText)).toBeVisible();
      await expect(
        threadsToggle(author!).getByTestId(TestId.UNREAD_COUNT)
      ).toHaveCount(0);
    }
  );
});

test('deleting a parent closes its thread', async ({ browser }) => {
  const parentText = `doomed parent ${RUN_ID}`;

  await withClients(browser, ['userc'], async ([page]) => {
    await openChannel(page!, LIVE_MESSAGES_CHANNEL);
    await sendMessage(page!, parentText);
    await replyInThread(page!, parentText);
    await sendMessage(threadView(page!), `doomed reply ${RUN_ID}`);

    const parent = messageByText(page!, parentText);

    await parent.hover();
    await parent.getByTestId(TestId.MESSAGE_DELETE).click();
    await confirmDialog(page!);

    await expect(threadView(page!)).toHaveCount(0);
  });
});

test('a message in a channel hidden behind the threads view stays unread', async ({
  browser
}) => {
  const messageText = `while hidden ${RUN_ID}`;

  await withClients(browser, ['userd', 'usere'], async ([watcher, sender]) => {
    await openChannel(watcher!, LIVE_MESSAGES_CHANNEL);
    await threadsToggle(watcher!).click();

    await openChannel(sender!, LIVE_MESSAGES_CHANNEL);
    await sendMessage(sender!, messageText);

    // nothing on screen shows the message arriving behind the threads view, so this gives the
    // event time to land. arriving later would only make the test pass for the wrong reason,
    // never fail it
    await watcher!.waitForTimeout(1_000);

    // through the dms and back, so the channel list shows without uncovering the channel
    await watcher!.getByTestId(TestId.DM_TOGGLE).click();
    await watcher!.getByTestId(TestId.DM_TOGGLE).click();

    await expect(
      watcher!
        .getByTestId(TestId.CHANNEL_ITEM)
        .filter({ hasText: LIVE_MESSAGES_CHANNEL })
        .getByTestId(TestId.UNREAD_COUNT)
    ).toBeVisible();
  });
});

test('jumping to a search result from the threads view shows the message', async ({
  browser
}) => {
  await withClients(browser, ['testuser'], async ([page]) => {
    await threadsToggle(page!).click();

    await page!.keyboard.press('ControlOrMeta+K');
    await page!.getByTestId(TestId.SEARCH_INPUT).fill('Mock message 150');
    await page!.getByTestId(TestId.SEARCH_RESULT_JUMP).first().click();

    await expect(
      messageByText(page!, 'Mock message 150').first()
    ).toBeVisible();
    await expect(threadView(page!)).toHaveCount(0);
  });
});
