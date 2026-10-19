import { describe, expect, test } from 'bun:test';
import {
  PLUGIN_NOTIFICATION_LIMIT,
  PLUGIN_NOTIFICATION_WINDOW_MS,
  takePluginNotificationSlot
} from '../plugin-notification-rate-limit';

// every test uses its own plugin id, the limiter keeps its counts for the whole run
describe('plugin notification rate limit', () => {
  test('allows up to the limit within the window and refuses the next one', () => {
    const now = 1_000_000;

    for (let index = 0; index < PLUGIN_NOTIFICATION_LIMIT; index++) {
      expect(takePluginNotificationSlot('flood', now + index)).toBe(true);
    }

    expect(takePluginNotificationSlot('flood', now + 10)).toBe(false);
  });

  test('allows notifications again once the window has passed', () => {
    const now = 2_000_000;

    for (let index = 0; index < PLUGIN_NOTIFICATION_LIMIT; index++) {
      takePluginNotificationSlot('recovers', now);
    }

    expect(takePluginNotificationSlot('recovers', now + 1)).toBe(false);
    expect(
      takePluginNotificationSlot(
        'recovers',
        now + PLUGIN_NOTIFICATION_WINDOW_MS
      )
    ).toBe(true);
  });

  test('counts every plugin separately', () => {
    const now = 3_000_000;

    for (let index = 0; index < PLUGIN_NOTIFICATION_LIMIT; index++) {
      takePluginNotificationSlot('noisy', now);
    }

    expect(takePluginNotificationSlot('noisy', now)).toBe(false);
    expect(takePluginNotificationSlot('quiet', now)).toBe(true);
  });
});
