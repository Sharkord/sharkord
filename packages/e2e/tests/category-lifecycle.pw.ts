import type { Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';

// the spec builds and removes its own category, so it touches nothing the rest of the suite
// reads and survives a retry. a seeded one would be gone on the second attempt
// channel names cap at 27 characters, so the run marker is short enough to fit inside one
const RUN_ID = Date.now().toString().slice(-8);

const CATEGORY = `Doomed Category ${RUN_ID}`;
const CHANNEL = `doomed-channel-${RUN_ID}`;

const categoryItem = (page: Page, name: string) =>
  page.getByTestId(TestId.CATEGORY_ITEM).filter({ hasText: name });

const submitDialog = async (page: Page, value: string) => {
  await page.getByRole('dialog').getByRole('textbox').fill(value);
  await page.keyboard.press('Enter');
};

const createCategoryWithChannel = async (page: Page) => {
  await page.getByTestId(TestId.SERVER_MENU_TRIGGER).click();
  await page.getByTestId(TestId.SERVER_MENU_ADD_CATEGORY).click();
  await submitDialog(page, CATEGORY);

  await expect(categoryItem(page, CATEGORY)).toBeVisible();

  await categoryItem(page, CATEGORY)
    .getByTestId(TestId.CATEGORY_ADD_CHANNEL)
    .click();
  await submitDialog(page, CHANNEL);

  // a rejected name leaves the dialog open and the category empty, which would otherwise
  // surface as the watcher never seeing a category that was never worth seeing
  await expect(page.getByText(CHANNEL)).toBeVisible();
};

const deleteCategory = async (page: Page, name: string) => {
  // the context menu wraps the name, not the whole row: the row's padding and its + button
  // are outside the trigger
  await categoryItem(page, name).getByText(name).click({ button: 'right' });
  await page.getByTestId(TestId.CATEGORY_MENU_DELETE).click();

  // the confirmation's confirm button is autofocused
  await page.keyboard.press('Enter');
};

// categories.test.ts covers the server side: the channels are announced and any call in them
// is dropped. what only a browser shows is the other client's sidebar reacting to those
// events, which is the half that would silently need a reload if a subscription were missed
test('deleting a category removes it and its channels from every client', async ({
  browser
}) => {
  const ownerContext = await browser.newContext();
  const watcherContext = await browser.newContext();

  try {
    const owner = await ownerContext.newPage();
    const watcher = await watcherContext.newPage();

    await loginAs(owner, 'testowner', 'password123');
    await loginAs(watcher, 'testuser', 'password123');

    await createCategoryWithChannel(owner);

    await expect(categoryItem(watcher, CATEGORY)).toBeVisible();
    await expect(watcher.getByText(CHANNEL)).toBeVisible();

    await deleteCategory(owner, CATEGORY);

    for (const page of [owner, watcher]) {
      await expect(categoryItem(page, CATEGORY)).toHaveCount(0);
      await expect(page.getByText(CHANNEL)).toHaveCount(0);
    }
  } finally {
    await ownerContext.close().catch(() => {});
    await watcherContext.close().catch(() => {});
  }
});
