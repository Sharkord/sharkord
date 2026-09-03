import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { openChannel } from './helpers/channels';
import { withSecondClient } from './helpers/clients';

// the seed grants USE_PLUGINS to the moderator role alone, so testmoderator sees
// plugin UI and testuser does not. the owner sees everything either way
const OWNER = { identity: 'testowner', password: 'password123' };
const MODERATOR = { identity: 'testmoderator', password: 'password123' };
const PLAIN_USER = { identity: 'testuser', password: 'password123' };

const topbarSlot = (page: Page) => page.getByTestId('e2e-plugin-topbar');
const chatActionSlot = (page: Page) =>
  page.getByTestId('e2e-plugin-chat-action');

const openUserSettings = (page: Page) =>
  page.getByTestId(TestId.USER_SETTINGS_TRIGGER).click();

const openPluginUserSettings = async (page: Page) => {
  await openUserSettings(page);
  await settingsEntry(page, 'E2E Plugin').click();
};

const storedNote = (page: Page) => page.getByTestId('e2e-plugin-note');

const settingsEntry = (page: Page, label: string) =>
  page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY).filter({ hasText: label });

const openServerSettings = async (page: Page) => {
  await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
  await page.getByTestId(TestId.SERVER_MENU_SERVER_SETTINGS).click();
};

const pluginToggle = (page: Page, name: string) =>
  page
    .getByTestId(TestId.INSTALLED_PLUGIN_ITEM)
    .filter({ hasText: name })
    .getByRole('switch');

// tab labels are translated, so this keys on the tab's value instead
const pluginTab = (page: Page, tab: string) =>
  page.locator(`[data-tab="${tab}"]`);

test('renders a plugin component in a slot that is always on screen', async ({
  page
}) => {
  await loginAs(page, OWNER.identity, OWNER.password);

  await expect(topbarSlot(page)).toBeVisible();
});

// this slot only mounts with a channel open, unlike the topbar
test('renders a plugin component in the chat actions slot', async ({
  page
}) => {
  await loginAs(page, OWNER.identity, OWNER.password);
  await openChannel(page, 'General');

  await expect(chatActionSlot(page)).toBeVisible();
});

test('renders the plugin entry and its component in user settings', async ({
  page
}) => {
  await loginAs(page, OWNER.identity, OWNER.password);
  await openUserSettings(page);
  await settingsEntry(page, 'E2E Plugin').click();

  await expect(page.getByTestId('e2e-plugin-user-settings')).toBeVisible();
});

const restrictedAction = (page: Page) =>
  page.getByTestId('e2e-plugin-restricted-action');
const openAction = (page: Page) => page.getByTestId('e2e-plugin-open-action');

// the owner is never restricted, whatever a capability declares
test('a plugin ui reflects the access the owner has', async ({ page }) => {
  await loginAs(page, OWNER.identity, OWNER.password);

  await expect(restrictedAction(page)).toBeEnabled();
  await expect(openAction(page)).toBeEnabled();
});

// the moderator may use plugins but does not hold MANAGE_MESSAGES, which is what
// the restricted action declares
test('a plugin ui reflects a capability the user may not use', async ({
  page
}) => {
  await loginAs(page, MODERATOR.identity, MODERATOR.password);

  await expect(restrictedAction(page)).toBeDisabled();
  await expect(openAction(page)).toBeEnabled();
});

test('renders a plugin custom tab in the plugin view', async ({ page }) => {
  await loginAs(page, OWNER.identity, OWNER.password);

  await openServerSettings(page);
  await settingsEntry(page, 'E2E Plugin').click();
  await pluginTab(page, 'e2e-tab').click();

  await expect(page.getByTestId('e2e-plugin-tab')).toBeVisible();
});

test('a user allowed to use plugins sees the component', async ({ page }) => {
  await loginAs(page, MODERATOR.identity, MODERATOR.password);

  await expect(topbarSlot(page)).toBeVisible();
});

// the failure this guards against is a client wide disconnect, which no unit
// test sees: a user without USE_PLUGINS still subscribes to the plugin topics
test('a user not allowed to use plugins sees nothing and stays connected', async ({
  page
}) => {
  await loginAs(page, PLAIN_USER.identity, PLAIN_USER.password);

  await expect(page.getByTestId(TestId.SERVER_VIEW)).toBeVisible();
  await expect(topbarSlot(page)).toBeHidden();

  // opening a channel proves the socket is alive rather than the page merely
  // rendered: a dropped connection never gets this far
  await openChannel(page, 'General');

  await expect(page.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)).toBeVisible();
  await expect(chatActionSlot(page)).toBeHidden();
});

// the components come and go over the socket, so nothing here reloads the page:
// a plugin toggled off has to disappear on its own
test('disabling and enabling a plugin removes and restores its components', async ({
  page
}) => {
  await loginAs(page, OWNER.identity, OWNER.password);

  await expect(topbarSlot(page)).toBeVisible();

  await openServerSettings(page);
  await settingsEntry(page, 'Plugins').click();

  const toggle = pluginToggle(page, 'E2E Plugin');

  await toggle.click();

  await expect(topbarSlot(page)).toBeHidden();
  await expect(settingsEntry(page, 'E2E Plugin')).toBeHidden();

  await toggle.click();

  await expect(topbarSlot(page)).toBeVisible();
  await expect(settingsEntry(page, 'E2E Plugin')).toBeVisible();
});

// the whole per-user storage loop through a browser: the hook reads, the button
// writes, and a reload proves it landed in the database rather than in memory
test('a plugin stores and reloads data for the user viewing it', async ({
  page,
  browser
}) => {
  await loginAs(page, OWNER.identity, OWNER.password);
  await openPluginUserSettings(page);

  await expect(storedNote(page)).toHaveText('empty');

  await page.getByTestId('e2e-plugin-save').click();

  await expect(storedNote(page)).toHaveText('saved');

  // a full page load rather than a refresh: only auto-login sessions resume one,
  // and signing in again rebuilds the store from nothing, so the value can only
  // come back from the database
  await loginAs(page, OWNER.identity, OWNER.password);
  await openPluginUserSettings(page);

  await expect(storedNote(page)).toHaveText('saved');

  // the row is keyed by plugin and user, so another user sees their own nothing
  await withSecondClient(
    browser,
    MODERATOR.identity,
    MODERATOR.password,
    async (moderatorPage) => {
      await openPluginUserSettings(moderatorPage);

      await expect(storedNote(moderatorPage)).toHaveText('empty');
    }
  );
});
