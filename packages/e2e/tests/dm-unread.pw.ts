import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { openChannel } from './helpers/channels';
import { dmItem, openDmPanel, startDmWith } from './helpers/dms';
import { sendMessage } from './helpers/messages';

// the seeded conversation belongs to user a and user b, and sessions.pw.ts kicks one and takes
// the other offline. this opens its own between two users nobody disconnects
const READER = {
  identity: 'testuser',
  name: 'Test User',
  password: 'password123'
};

const RUN_ID = Date.now().toString().slice(-8);

// dms.test.ts covers the read state itself: the count clears for a participant and stays clear
// until a newer message arrives. what only a browser shows is the badge following it, which is
// the half that broke in R2, where dms came up unread and would not clear on open
test('a dm badge clears when the conversation is opened and stays clear', async ({
  browser
}) => {
  const senderContext = await browser.newContext();
  const readerContext = await browser.newContext();

  try {
    const sender = await senderContext.newPage();
    const reader = await readerContext.newPage();

    await loginAs(sender, 'testowner', 'password123');

    await startDmWith(sender, READER.name);

    await expect(
      sender.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
    ).toBeVisible();

    await sendMessage(sender, `dm badge check ${RUN_ID}`);

    await loginAs(reader, READER.identity, READER.password);
    await openDmPanel(reader);

    const conversation = dmItem(reader, 'Test Owner');

    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toBeVisible({
      timeout: 15_000
    });

    await conversation.click();

    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toHaveCount(0);

    // R2's actual symptom: the badge came back the moment you looked away
    await openDmPanel(reader);
    await openChannel(reader, 'General');
    await openDmPanel(reader);

    await expect(conversation.getByTestId(TestId.UNREAD_COUNT)).toHaveCount(0);
  } finally {
    await senderContext.close().catch(() => {});
    await readerContext.close().catch(() => {});
  }
});
