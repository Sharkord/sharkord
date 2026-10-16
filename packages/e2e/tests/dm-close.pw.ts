import { TestId } from '@sharkord/shared';
import { expect, test } from './fixtures';
import { withClients } from './helpers/clients';
import { dmItem, openDmPanel, startDmWith } from './helpers/dms';
import { sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

test('opening a dm shows nothing to the other person until a message is sent', async ({
  browser
}) => {
  await withClients(browser, ['userc', 'userd'], async ([opener, other]) => {
    await openDmPanel(other!);

    await startDmWith(opener!, 'User D');
    await expect(
      opener!.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
    ).toBeVisible();

    await expect(dmItem(other!, 'User C')).toHaveCount(0);

    await sendMessage(opener!, `first words ${RUN_ID}`);

    await expect(dmItem(other!, 'User C')).toBeVisible();
  });
});

test('a closed dm stays hidden until the other person writes again', async ({
  browser
}) => {
  await withClients(browser, ['usere', 'userd'], async ([closer, other]) => {
    await startDmWith(closer!, 'User D');
    await sendMessage(closer!, `before closing ${RUN_ID}`);

    const conversation = dmItem(closer!, 'User D');

    await conversation.hover();
    await conversation.getByTestId(TestId.DM_CLOSE).click();

    await expect(conversation).toHaveCount(0);

    await openDmPanel(other!);
    await dmItem(other!, 'User E').click();
    await sendMessage(other!, `after closing ${RUN_ID}`);

    await expect(conversation).toBeVisible();
  });
});
