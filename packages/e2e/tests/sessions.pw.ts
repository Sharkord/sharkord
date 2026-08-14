import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';

// these two are reserved for this file, one per test. a kick bumps the target's token version
// and closes their sockets, so a spec that kicks a user another spec is logged in as would
// fail that spec instead of its own. everything else in the suite runs as testowner or testuser
const KICKED = { identity: 'usera', name: 'User A', password: 'password123' };
const WATCHED = { identity: 'userb', name: 'User B', password: 'password123' };

const REASON = 'Kicked by the session spec';

// long enough for a wrong offline to reach the watcher, short enough not to pad the run
const PRESENCE_SETTLE_MS = 1500;

const memberStatus = (page: Page, name: string) =>
  page
    .getByTestId(TestId.MEMBER_ITEM)
    .filter({ hasText: name })
    .getByTestId(TestId.USER_STATUS);

const kickFromModView = async (admin: Page, name: string, reason: string) => {
  await admin.getByTestId(TestId.MEMBER_ITEM).filter({ hasText: name }).click();
  await admin.getByTestId(TestId.USER_POPOVER_MODERATE).click();
  await admin.getByTestId(TestId.MOD_VIEW_KICK).click();

  // the reason prompt is the only textbox in the dialog, and it submits on enter
  await admin.getByRole('alertdialog').getByRole('textbox').fill(reason);
  await admin.keyboard.press('Enter');
};

// the server side of this is covered by users.test.ts, which asserts every socket of the
// target is closed with the right code. what only a browser can show is the client reacting
// to that close: leaving the app, and doing it as a kick rather than as a dropped connection
test('a kick disconnects every tab of the kicked user', async ({ browser }) => {
  const kickedContext = await browser.newContext();
  const adminContext = await browser.newContext();

  try {
    const firstTab = await kickedContext.newPage();
    const secondTab = await kickedContext.newPage();

    await loginAs(firstTab, KICKED.identity, KICKED.password);
    await loginAs(secondTab, KICKED.identity, KICKED.password);

    const admin = await adminContext.newPage();

    await loginAs(admin, 'testowner', 'password123');
    await kickFromModView(admin, KICKED.name, REASON);

    for (const tab of [firstTab, secondTab]) {
      await expect(tab.getByText(REASON)).toBeVisible();

      // the disconnected screen replaces the app. a kick that fell through to the reconnect
      // path would leave the server view mounted under the overlay instead
      await expect(tab.getByTestId(TestId.SERVER_VIEW)).toBeHidden();
    }

    // a kick ends the session, it does not bar re-entry
    await loginAs(firstTab, KICKED.identity, KICKED.password);

    await expect(firstTab.getByTestId(TestId.SERVER_VIEW)).toBeVisible();
  } finally {
    await kickedContext.close().catch(() => {});
    await adminContext.close().catch(() => {});
  }
});

// presence.test.ts covers the server deciding when the user goes offline. what it cannot show
// is the watcher's member list reacting, which is the half that broke when presence was
// refcounted per socket instead of per user
test('a user stays online until their last tab closes', async ({ browser }) => {
  const watchedContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  try {
    const firstTab = await watchedContext.newPage();
    const secondTab = await watchedContext.newPage();

    await loginAs(firstTab, WATCHED.identity, WATCHED.password);
    await loginAs(secondTab, WATCHED.identity, WATCHED.password);

    const watcher = await watcherContext.newPage();

    await loginAs(watcher, 'testowner', 'password123');

    await expect(memberStatus(watcher, WATCHED.name)).toHaveAttribute(
      'data-status',
      'online'
    );

    await firstTab.close();

    // a wait rather than a poll: this asserts an event does *not* arrive, and toHaveAttribute
    // would pass on its first check long before a wrong offline had time to land
    await watcher.waitForTimeout(PRESENCE_SETTLE_MS);

    await expect(memberStatus(watcher, WATCHED.name)).toHaveAttribute(
      'data-status',
      'online'
    );

    await secondTab.close();

    await expect(memberStatus(watcher, WATCHED.name)).toHaveAttribute(
      'data-status',
      'offline'
    );
  } finally {
    await watchedContext.close().catch(() => {});
    await watcherContext.close().catch(() => {});
  }
});
