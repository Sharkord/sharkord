import type { Locator, Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { confirmDialog } from './helpers/dialogs';

const STORAGE_KEY = 'sharkord-freeze-animated-avatars';

const ANIMATED_IMAGE = Buffer.from(
  'R0lGODlhIAAgAIEAAP8AAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQAFAAAACwAAAAAIAAgAAAINQABCBxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJUmRAACH5BAEUAAEALAAAAAAgACAAgQAA/wAAAAAAAAAAAAg1AAEIHEiwoMGDCBMqXMiwocOHECNKnEixosWLGDNq3Mixo8ePIEOKHEmypMmTKFOqXMlSZEAAOw==',
  'base64'
);

const openOtherSettings = async (page: Page) => {
  const trigger = page.getByTestId(TestId.USER_SETTINGS_TRIGGER);
  const entries = page.getByTestId(TestId.SETTINGS_SIDEBAR_ENTRY);
  const others = entries.filter({ hasText: 'Others' });

  await trigger.click();
  await others.click();

  const label = page.getByText('Freeze Animated Avatars and Banners', {
    exact: true
  });
  const group = label.locator('../../..');

  return group.getByRole('switch');
};

const saveSettings = async (page: Page) => {
  const save = page.getByRole('button', { name: 'Save Changes', exact: true });

  const saveBar = page.getByText('You have unsaved changes', { exact: true });

  await save.click();
  await expect(saveBar).toBeHidden();
};

const uploadAnimatedProfileImage = async (page: Page, label: string) => {
  const trigger = page.getByTestId(TestId.USER_SETTINGS_TRIGGER);

  await trigger.click();

  const pickerLabel = page.getByText(label, { exact: true });
  const pickerGroup = pickerLabel.locator('../../..');
  const pickers = pickerGroup.locator('.cursor-pointer');
  const picker = pickers.first();
  const chooserPromise = page.waitForEvent('filechooser');

  await picker.click();

  const chooser = await chooserPromise;

  await chooser.setFiles({
    name: `animated-${label.toLowerCase()}.gif`,
    mimeType: 'image/gif',
    buffer: ANIMATED_IMAGE
  });
  await saveSettings(page);
  await page.keyboard.press('Escape');
};

const enableFreeze = async (page: Page) => {
  const toggle = await openOtherSettings(page);

  await toggle.check();
  await saveSettings(page);
  await page.keyboard.press('Escape');
  await page.mouse.move(0, 0);
};

const expectStillUntilHover = async (
  page: Page,
  target: Locator,
  image: Locator,
  canvas: Locator
) => {
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width');
  await expect(image).toBeHidden();

  const bounds = await target.boundingBox();

  expect(bounds).not.toBeNull();

  const captureFrame = () =>
    page.screenshot({
      clip: {
        x: bounds!.x + bounds!.width / 2 - 4,
        y: bounds!.y + bounds!.height / 2 - 4,
        width: 8,
        height: 8
      }
    });
  const still = await captureFrame();

  await target.hover();
  await expect(canvas).toBeHidden();
  await expect(image).toBeVisible();

  const frame = await captureFrame();
  let nextFrame = frame;

  await expect
    .poll(async () => {
      nextFrame = await captureFrame();

      return nextFrame.equals(frame);
    })
    .toBe(false);

  expect([frame, nextFrame]).toContainEqual(still);

  await page.mouse.move(0, 0);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('width');
  await expect(image).toBeHidden();

  const restoredStill = await captureFrame();

  expect(restoredStill.equals(still)).toBe(true);
};

test('saves both values of the avatar preference and restores them after reload', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');

  const toggle = await openOtherSettings(page);

  await expect(toggle).not.toBeChecked();

  for (const enabled of [true, false]) {
    await toggle.setChecked(enabled);
    await saveSettings(page);

    const stored = await page.evaluate(
      (key) => localStorage.getItem(key),
      STORAGE_KEY
    );

    expect(stored).toBe(String(enabled));

    await page.reload();
    await loginAs(page, 'testowner', 'password123');

    const restored = await openOtherSettings(page);

    await expect(restored).toBeChecked({ checked: enabled });
  }
});

test('discards an unsaved avatar preference', async ({ page }) => {
  await loginAs(page, 'testowner', 'password123');

  const toggle = await openOtherSettings(page);
  const saveBar = page.getByText('You have unsaved changes', { exact: true });

  await toggle.check();
  await expect(saveBar).toBeVisible();
  await page.keyboard.press('Escape');
  await confirmDialog(page);

  const restored = await openOtherSettings(page);

  await expect(restored).not.toBeChecked();

  const stored = await page.evaluate(
    (key) => localStorage.getItem(key),
    STORAGE_KEY
  );

  expect(stored).toBeNull();
});

test('shows a still avatar until hover and returns to it when the pointer leaves', async ({
  page
}) => {
  await loginAs(page, 'userc', 'password123');
  await uploadAnimatedProfileImage(page, 'Avatar');

  const avatars = page.locator('[data-slot="avatar"]');
  const ownAvatar = avatars.filter({ has: page.locator('img[src*=".gif"]') });
  const avatar = ownAvatar.first();
  const image = avatar.locator('img');
  const canvas = avatar.locator('canvas');

  await expect(image).toBeVisible();
  await expect(canvas).toHaveCount(0);

  await enableFreeze(page);
  await expectStillUntilHover(page, avatar, image, canvas);
});

// flaky when the file runs in parallel: the hover capture sometimes lands on a frame that
// matches neither the still nor the next one
test.skip('shows a still banner until hover and returns to it when the pointer leaves', async ({
  page
}) => {
  await loginAs(page, 'userd', 'password123');
  await uploadAnimatedProfileImage(page, 'Banner');

  const member = page.getByTestId(TestId.MEMBER_ITEM).filter({
    hasText: 'User D'
  });
  const image = page.locator('[style*=".gif"]');
  const banner = image.locator('..');
  const canvas = banner.locator('canvas');

  await member.click();
  await expect(image).toBeVisible();
  await expect(canvas).toHaveCount(0);
  await page.keyboard.press('Escape');

  await enableFreeze(page);
  await member.click();
  await page.mouse.move(0, 0);

  const popover = page.locator('[data-slot="popover-content"]');

  await expect(popover).toHaveCSS('opacity', '1');
  await expectStillUntilHover(page, banner, image, canvas);
});
