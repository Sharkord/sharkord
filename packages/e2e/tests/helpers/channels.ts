import { expect, type Page } from '@playwright/test';
import { TestId } from '@sharkord/shared';
import { messagesContainer } from './scroll';

// read-only, so the pagination specs can count its pages without another spec's message
// shifting them
const INFINITE_SCROLL_CHANNEL = 'Infinite Scroll';

// the one specs may send into
const LIVE_MESSAGES_CHANNEL = 'Live Messages';

const MEDIA_CHANNEL = 'Messages Render';

// force, because the channel list virtualises and the target can be under the hover state of
// the row above it at the moment playwright measures
const openChannel = async (page: Page, name: string) => {
  await page
    .getByTestId(TestId.CHANNEL_ITEM)
    .filter({ hasText: name })
    .first()
    .click({ force: true });

  await expect(messagesContainer(page)).toBeVisible();
};

export {
  INFINITE_SCROLL_CHANNEL,
  LIVE_MESSAGES_CHANNEL,
  MEDIA_CHANNEL,
  openChannel
};
