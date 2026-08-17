import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { confirmDialog } from './helpers/dialogs';

// these two are reserved for this file, one per test. a kick bumps the target's token version
// and closes their sockets, so a spec that kicks a user another spec is logged in as would
// fail that spec instead of its own. everything else in the suite runs as testowner or testuser
const KICKED = { identity: 'usera', name: 'User A', password: 'password123' };
const WATCHED = { identity: 'userb', name: 'User B', password: 'password123' };
const BANNED = {
  identity: 'testmoderator',
  name: 'Test Moderator',
  password: 'password123'
};

const REASON = 'Kicked by the session spec';
const BAN_REASON = 'Banned by the session spec';

// long enough for a wrong offline to reach the watcher, short enough not to pad the run
const PRESENCE_SETTLE_MS = 1500;

const memberStatus = (page: Page, name: string) =>
  page
    .getByTestId(TestId.MEMBER_ITEM)
    .filter({ hasText: name })
    .getByTestId(TestId.USER_STATUS);

const openModView = async (admin: Page, name: string) => {
  await admin.getByTestId(TestId.MEMBER_ITEM).filter({ hasText: name }).click();
  await admin.getByTestId(TestId.USER_POPOVER_MODERATE).click();
};

// kick and ban both open the same reason prompt, which is the only textbox in the dialog
// and submits on enter
const moderateWithReason = async (
  admin: Page,
  name: string,
  action: TestId,
  reason: string
) => {
  await openModView(admin, name);
  await admin.getByTestId(action).click();
  await admin.getByRole('alertdialog').getByRole('textbox').fill(reason);
  await admin.keyboard.press('Enter');
};

// both tests here kick user a, so they cannot run at the same time: one's kick would end the
// other's session and fail the wrong test
test.describe('a kicked user', () => {
  test.describe.configure({ mode: 'serial' });

  // the server side of this is covered by users.test.ts, which asserts every socket of the
  // target is closed with the right code. what only a browser can show is the client reacting
  // to that close: leaving the app, and doing it as a kick rather than as a dropped connection
  test('a kick disconnects every tab of the kicked user', async ({
    browser
  }) => {
    const kickedContext = await browser.newContext();
    const adminContext = await browser.newContext();

    try {
      const firstTab = await kickedContext.newPage();
      const secondTab = await kickedContext.newPage();

      await loginAs(firstTab, KICKED.identity, KICKED.password);
      await loginAs(secondTab, KICKED.identity, KICKED.password);

      const admin = await adminContext.newPage();

      await loginAs(admin, 'testowner', 'password123');
      await moderateWithReason(
        admin,
        KICKED.name,
        TestId.MOD_VIEW_KICK,
        REASON
      );

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

  // auto-login.pw.ts plants a token the server cannot even parse. a revoked one is properly
  // signed and only fails the token version check, so a client that treats the two differently
  // would pass that test and strand the user here
  test('a revoked token sends an auto-login tab back to the connect screen', async ({
    browser
  }) => {
    const savedContext = await browser.newContext();
    const liveContext = await browser.newContext();
    const adminContext = await browser.newContext();

    try {
      const saved = await savedContext.newPage();

      await saved.goto('/');
      await saved.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH).click();
      await saved
        .getByTestId(TestId.CONNECT_IDENTITY_INPUT)
        .fill(KICKED.identity);
      await saved
        .getByTestId(TestId.CONNECT_PASSWORD_INPUT)
        .fill(KICKED.password);
      await saved.getByTestId(TestId.CONNECT_BUTTON).click();
      await saved.getByTestId(TestId.SERVER_VIEW).waitFor();

      // closed before the kick lands, so its own teardown never runs and the token stays on
      // disk exactly as it would for a tab that was not open at the time
      await saved.close();

      const live = await liveContext.newPage();

      await loginAs(live, KICKED.identity, KICKED.password);

      const admin = await adminContext.newPage();

      await loginAs(admin, 'testowner', 'password123');
      await moderateWithReason(
        admin,
        KICKED.name,
        TestId.MOD_VIEW_KICK,
        REASON
      );

      await expect(live.getByText(REASON)).toBeVisible();

      const reopened = await savedContext.newPage();

      await reopened.goto('/');

      await expect(reopened.getByTestId(TestId.CONNECT_BUTTON)).toBeVisible({
        timeout: 10_000
      });
      await expect(
        reopened.getByTestId(TestId.CONNECT_IDENTITY_INPUT)
      ).toHaveValue(KICKED.identity);
      await expect(
        reopened
          .getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH)
          .locator('button[role="switch"]')
      ).toHaveAttribute('data-state', 'unchecked');

      const savedToken = await reopened.evaluate(() =>
        localStorage.getItem('sharkord-auto-login-token')
      );

      expect(savedToken).toBeNull();
    } finally {
      await savedContext.close().catch(() => {});
      await liveContext.close().catch(() => {});
      await adminContext.close().catch(() => {});
    }
  });
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

// a ban is the one disconnect the user cannot walk back from, so the screen it lands on must
// not offer the way back that a kick does. testmoderator is unused elsewhere, and the unban in
// the finally is what keeps a failed attempt from locking every retry out
test('a ban ends the session and offers no way back', async ({ browser }) => {
  const bannedContext = await browser.newContext();
  const adminContext = await browser.newContext();

  const admin = await adminContext.newPage();

  try {
    const victim = await bannedContext.newPage();

    await loginAs(victim, BANNED.identity, BANNED.password);
    await loginAs(admin, 'testowner', 'password123');

    await moderateWithReason(
      admin,
      BANNED.name,
      TestId.MOD_VIEW_BAN,
      BAN_REASON
    );

    await expect(victim.getByText(BAN_REASON)).toBeVisible();
    await expect(victim.getByTestId(TestId.SERVER_VIEW)).toBeHidden();

    // the kick screen offers this button, the ban screen must not
    await expect(
      victim.getByRole('button', { name: 'Go to Connect Screen' })
    ).toHaveCount(0);

    await victim.goto('/');
    await victim
      .getByTestId(TestId.CONNECT_IDENTITY_INPUT)
      .fill(BANNED.identity);
    await victim
      .getByTestId(TestId.CONNECT_PASSWORD_INPUT)
      .fill(BANNED.password);
    await victim.getByTestId(TestId.CONNECT_BUTTON).click();

    await expect(victim.getByTestId(TestId.SERVER_VIEW)).toHaveCount(0);

    // undone here rather than in a finally: the sheet is still open on this user, and the
    // assertion is what proves the ban was actually lifted. a failure before this point
    // leaves the user banned, so a retry needs the re-seed that every run does anyway
    await admin.getByTestId(TestId.MOD_VIEW_BAN).click();
    await confirmDialog(admin);

    await expect(admin.getByTestId(TestId.MOD_VIEW_BAN)).toHaveText(/Ban/);
  } finally {
    await bannedContext.close().catch(() => {});
    await adminContext.close().catch(() => {});
  }
});

test('disconnecting from the server menu logs out and clears the saved token', async ({
  browser
}) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();

    await page.goto('/');
    await page.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH).click();
    await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('testuser');
    await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill('password123');
    await page.getByTestId(TestId.CONNECT_BUTTON).click();
    await page.getByTestId(TestId.SERVER_VIEW).waitFor();

    await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
    await page.getByTestId(TestId.SERVER_MENU_DISCONNECT).click();
    await confirmDialog(page);

    await expect(page.getByTestId(TestId.CONNECT_BUTTON)).toBeVisible();

    const savedToken = await page.evaluate(() =>
      localStorage.getItem('sharkord-auto-login-token')
    );

    expect(savedToken).toBeNull();
  } finally {
    await context.close().catch(() => {});
  }
});

// auto-login.pw.ts only covers a token the server refuses. a valid one has to survive the
// reload, which is the half that would strand a user on the connect screen every refresh
test('a refresh resumes an auto-login session without asking again', async ({
  browser
}) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();

    await page.goto('/');
    await page.getByTestId(TestId.CONNECT_AUTO_LOGIN_SWITCH).click();
    await page.getByTestId(TestId.CONNECT_IDENTITY_INPUT).fill('userb');
    await page.getByTestId(TestId.CONNECT_PASSWORD_INPUT).fill('password123');
    await page.getByTestId(TestId.CONNECT_BUTTON).click();
    await page.getByTestId(TestId.SERVER_VIEW).waitFor();

    await page.reload();

    await expect(page.getByTestId(TestId.SERVER_VIEW)).toBeVisible();

    const savedToken = await page.evaluate(() =>
      localStorage.getItem('sharkord-auto-login-token')
    );

    expect(savedToken).not.toBeNull();
  } finally {
    await context.close().catch(() => {});
  }
});

// the identity is written on a successful login and read back as the connect form's initial
// value, so only a logout that unmounts the app can show whether it survives. the password is
// deliberately never stored, and an empty field is the whole of that guarantee
test('logging out leaves the identity prefilled and the password empty', async ({
  browser
}) => {
  const context = await browser.newContext();

  try {
    const page = await context.newPage();

    await loginAs(page, WATCHED.identity, WATCHED.password);

    await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
    await page.getByTestId(TestId.SERVER_MENU_DISCONNECT).click();
    await confirmDialog(page);

    await expect(page.getByTestId(TestId.CONNECT_BUTTON)).toBeVisible();
    await expect(page.getByTestId(TestId.CONNECT_IDENTITY_INPUT)).toHaveValue(
      WATCHED.identity
    );
    await expect(page.getByTestId(TestId.CONNECT_PASSWORD_INPUT)).toHaveValue(
      ''
    );
  } finally {
    await context.close().catch(() => {});
  }
});
