import type { Locator, Page, TestInfo } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { expect, loginAs, test } from './fixtures';
import { LIVE_MESSAGES_CHANNEL, openChannel } from './helpers/channels';
import { withClients } from './helpers/clients';
import { dmItem, openDmPanel, startDmWith } from './helpers/dms';
import { messageByText, sendMessage } from './helpers/messages';

const RUN_ID = Date.now().toString().slice(-8);

const PNG_BUFFER = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==',
  'base64'
);

const WEBM_BUFFER = Buffer.from(
  'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQJChYECGFOAZwEAAAAAAAIuEU2bdLpNu4tTq4QVSalmU6yBoU27i1OrhBZUrmtTrIHWTbuMU6uEElTDZ1OsggEjTbuMU6uEHFO7a1OsggIY7AEAAAAAAABZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVSalmsCrXsYMPQkBNgIxMYXZmNjEuNy4xMDBXQYxMYXZmNjEuNy4xMDBEiYhAXgAAAAAAABZUrmvIrgEAAAAAAAA/14EBc8WIQZfOX2K13QScgQAitZyDdW5kiIEAhoVWX1ZQOIOBASPjg4QCYloA4JCwgSC6gSCagQJVsIRVuYEBElTDZ/tzc59jwIBnyJlFo4dFTkNPREVSRIeMTGF2ZjYxLjcuMTAwc3PWY8CLY8WIQZfOX2K13QRnyKFFo4dFTkNPREVSRIeUTGF2YzYxLjE5LjEwMCBsaWJ2cHhnyKFFo4hEVVJBVElPTkSHkzAwOjAwOjAwLjEyMDAwMDAwMAAfQ7Z18OeBAKO9gQAAgNACAJ0BKiAAIAAARwiFhYiFhIgCAgJ1qgP4AgghCD0A/v9NEv/8WFfxYV/FhX/xYV/8/M7txfzmAKOVgQAoALEBAAEQEAAYABhYL/QACHAAo5WBAFAAsQEAARAQABgAGFgv9AAIcAAcU7trkbuPs4EAt4r3gQHxggGj8IED',
  'base64'
);

const TXT_BUFFER = Buffer.from('plain text attachment');

type TUploadPayload = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

const tag = (label: string, testInfo: TestInfo) =>
  `${label} ${RUN_ID}-${testInfo.workerIndex}-${testInfo.repeatEachIndex}`;

const viewOnceToggle = (scope: Page | Locator) =>
  scope.getByRole('button', { name: 'View once' });

const previewCard = (page: Page, fileName: string) =>
  page.locator(`span[title="${fileName}"]`).locator('../../..');

const attachFiles = async (page: Page, files: TUploadPayload[]) => {
  await page.locator('input[type="file"]').setInputFiles(files);

  for (const file of files) {
    await expect(
      previewCard(page, file.name).getByRole('button')
    ).toBeAttached();
  }
};

const removeAttachment = async (page: Page, fileName: string) => {
  const card = previewCard(page, fileName);

  await card.hover();
  await card.getByRole('button').click({ force: true });
  await expect(page.locator(`span[title="${fileName}"]`)).toHaveCount(0);
};

const sendViewOnce = async (
  page: Page,
  file: TUploadPayload,
  caption: string
) => {
  await attachFiles(page, [file]);

  const toggle = viewOnceToggle(page);

  await expect(toggle).toBeEnabled();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await sendMessage(page, caption);

  await expect(toggle).toHaveCount(0);
};

test('view once toggle enables only for photos and videos and resets on unsupported files', async ({
  page
}) => {
  await loginAs(page, 'testowner', 'password123');
  await openChannel(page, LIVE_MESSAGES_CHANNEL);

  const toggle = viewOnceToggle(page);

  await expect(toggle).toHaveCount(0);

  await attachFiles(page, [
    { name: 'notes.txt', mimeType: 'text/plain', buffer: TXT_BUFFER }
  ]);
  await expect(toggle).toBeVisible();
  await expect(toggle).toBeDisabled();

  await removeAttachment(page, 'notes.txt');
  await expect(toggle).toHaveCount(0);

  await attachFiles(page, [
    { name: 'photo.png', mimeType: 'image/png', buffer: PNG_BUFFER }
  ]);
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await attachFiles(page, [
    { name: 'mixed.txt', mimeType: 'text/plain', buffer: TXT_BUFFER }
  ]);
  await expect(toggle).toBeDisabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');

  await removeAttachment(page, 'mixed.txt');
  await expect(toggle).toBeEnabled();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('a recipient opens a view once photo once in a channel while the sender tracks it live', async ({
  browser
}, testInfo) => {
  const caption = tag('vo channel', testInfo);

  await withClients(
    browser,
    ['testowner', 'userc'],
    async ([sender, recipient]) => {
      await openChannel(sender!, LIVE_MESSAGES_CHANNEL);
      await openChannel(recipient!, LIVE_MESSAGES_CHANNEL);

      await sendViewOnce(
        sender!,
        {
          name: 'channel-secret.png',
          mimeType: 'image/png',
          buffer: PNG_BUFFER
        },
        caption
      );

      const senderMessage = messageByText(sender!, caption);

      await expect(senderMessage).toContainText('Photo');
      await expect(senderMessage).toContainText('Nobody has opened it yet');
      await expect(
        senderMessage.getByRole('button', { name: 'Photo' })
      ).toHaveCount(0);

      const recipientMessage = messageByText(recipient!, caption);
      const openButton = recipientMessage.getByRole('button', {
        name: 'Photo'
      });

      await expect(openButton).toBeVisible();
      await openButton.click();

      const viewer = recipient!.getByRole('dialog', { name: 'Photo' });

      await expect(viewer).toBeVisible();

      const image = viewer.locator('img');

      await expect(image).toHaveAttribute('src', /^blob:/);
      await expect(image).toHaveJSProperty('naturalWidth', 1);
      await expect(viewer.locator('a')).toHaveCount(0);

      await viewer.getByRole('button', { name: 'Close' }).click();
      await expect(viewer).toBeHidden();

      await expect(
        recipientMessage.getByText('Opened', { exact: true })
      ).toBeVisible();
      await expect(
        recipientMessage.getByRole('button', { name: 'Photo' })
      ).toHaveCount(0);

      await expect(senderMessage).toContainText('Opened by User C');

      await recipient!.reload();
      await loginAs(recipient!, 'userc', 'password123');
      await openChannel(recipient!, LIVE_MESSAGES_CHANNEL);

      const reloadedMessage = messageByText(recipient!, caption);

      await expect(
        reloadedMessage.getByText('Opened', { exact: true })
      ).toBeVisible();
      await expect(
        reloadedMessage.getByRole('button', { name: 'Photo' })
      ).toHaveCount(0);
      await expect(reloadedMessage.locator('img')).toHaveCount(0);
    }
  );
});

test('a recipient opens a view once photo once in a dm and updates the sender live', async ({
  browser
}, testInfo) => {
  const caption = tag('vo dm', testInfo);

  await withClients(
    browser,
    ['testowner', 'usere'],
    async ([sender, recipient]) => {
      await startDmWith(sender!, 'User E');
      await expect(
        sender!.getByTestId(TestId.MESSAGE_COMPOSE_EDITOR)
      ).toBeVisible();

      await sendViewOnce(
        sender!,
        { name: 'dm-secret.png', mimeType: 'image/png', buffer: PNG_BUFFER },
        caption
      );

      const senderMessage = messageByText(sender!, caption);

      await expect(senderMessage).toContainText('Nobody has opened it yet');
      await expect(
        senderMessage.getByRole('button', { name: 'Photo' })
      ).toHaveCount(0);

      await openDmPanel(recipient!);
      await dmItem(recipient!, 'Test Owner').click();

      const recipientMessage = messageByText(recipient!, caption);
      const openButton = recipientMessage.getByRole('button', {
        name: 'Photo'
      });

      await expect(openButton).toBeVisible();
      await openButton.click();

      const viewer = recipient!.getByRole('dialog', { name: 'Photo' });

      await expect(viewer).toBeVisible();
      await expect(viewer.locator('img')).toHaveAttribute('src', /^blob:/);

      await viewer.getByRole('button', { name: 'Close' }).click();
      await expect(viewer).toBeHidden();

      await expect(
        recipientMessage.getByText('Opened', { exact: true })
      ).toBeVisible();
      await expect(senderMessage).toContainText('Opened by User E');
    }
  );
});

test('a failed view once download shows a translated error and retries without opening again', async ({
  browser
}, testInfo) => {
  const caption = tag('vo retry', testInfo);

  await withClients(
    browser,
    ['testowner', 'userd'],
    async ([sender, recipient]) => {
      await openChannel(sender!, LIVE_MESSAGES_CHANNEL);
      await openChannel(recipient!, LIVE_MESSAGES_CHANNEL);

      await sendViewOnce(
        sender!,
        { name: 'retry-secret.png', mimeType: 'image/png', buffer: PNG_BUFFER },
        caption
      );

      let downloads = 0;

      await recipient!.route('**/view-once/*', async (route) => {
        downloads++;

        if (downloads === 1) {
          await route.abort('failed');

          return;
        }

        await route.continue();
      });

      const recipientMessage = messageByText(recipient!, caption);

      await recipientMessage.getByRole('button', { name: 'Photo' }).click();

      await expect(
        recipient!.getByText('Failed to open view once media')
      ).toBeVisible();
      await expect(recipient!.getByText('Failed to fetch')).toHaveCount(0);
      await expect(
        recipientMessage.getByText('Opened', { exact: true })
      ).toHaveCount(0);

      await recipientMessage.getByRole('button', { name: 'Retry' }).click();

      const viewer = recipient!.getByRole('dialog', { name: 'Photo' });

      await expect(viewer).toBeVisible();
      await expect(viewer.locator('img')).toHaveAttribute('src', /^blob:/);
      expect(downloads).toBe(2);
      await expect(
        recipient!.getByText('You have already opened this file.')
      ).toHaveCount(0);

      await viewer.getByRole('button', { name: 'Close' }).click();
      await expect(viewer).toBeHidden();

      const openedMarker = recipientMessage.getByText('Opened', {
        exact: true
      });

      await expect(openedMarker).toBeVisible();
      await expect(openedMarker.locator('..')).toBeFocused();
      await expect(messageByText(sender!, caption)).toContainText(
        'Opened by User D'
      );
    }
  );
});

test('each channel member gets their own single view of a view once video', async ({
  browser
}, testInfo) => {
  const caption = tag('vo video', testInfo);

  await withClients(
    browser,
    ['testowner', 'userc', 'userd'],
    async ([sender, first, second]) => {
      await openChannel(sender!, LIVE_MESSAGES_CHANNEL);
      await openChannel(first!, LIVE_MESSAGES_CHANNEL);
      await openChannel(second!, LIVE_MESSAGES_CHANNEL);

      await sendViewOnce(
        sender!,
        { name: 'clip.webm', mimeType: 'video/webm', buffer: WEBM_BUFFER },
        caption
      );

      const senderMessage = messageByText(sender!, caption);

      await expect(senderMessage).toContainText('Video');
      await expect(senderMessage).toContainText('Nobody has opened it yet');

      const firstMessage = messageByText(first!, caption);

      await firstMessage.getByRole('button', { name: 'Video' }).click();

      const firstViewer = first!.getByRole('dialog', { name: 'Video' });

      await expect(firstViewer).toBeVisible();
      await expect(firstViewer.locator('video')).toHaveAttribute(
        'src',
        /^blob:/
      );
      await firstViewer.getByRole('button', { name: 'Close' }).click();
      await expect(firstViewer).toBeHidden();
      await expect(
        firstMessage.getByText('Opened', { exact: true })
      ).toBeVisible();

      const secondMessage = messageByText(second!, caption);
      const secondButton = secondMessage.getByRole('button', { name: 'Video' });

      await expect(secondButton).toBeVisible();
      await secondButton.click();

      const secondViewer = second!.getByRole('dialog', { name: 'Video' });

      await expect(secondViewer).toBeVisible();
      await expect(secondViewer.locator('video')).toHaveAttribute(
        'src',
        /^blob:/
      );
      await secondViewer.getByRole('button', { name: 'Close' }).click();
      await expect(secondViewer).toBeHidden();
      await expect(
        secondMessage.getByText('Opened', { exact: true })
      ).toBeVisible();

      await expect(senderMessage).toContainText('Opened by');
      await expect(senderMessage).toContainText('User C');
      await expect(senderMessage).toContainText('User D');
    }
  );
});
