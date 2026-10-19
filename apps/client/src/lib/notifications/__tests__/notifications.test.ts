import type { TAppNotification } from '@sharkord/shared';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { notify, onNotificationClick, requestNotificationPermission } from '..';

class FakeNotification {
  static permission: NotificationPermission = 'granted';
  static requestResult: NotificationPermission = 'granted';
  static created: FakeNotification[] = [];

  onclick: (() => void) | null = null;
  closed = false;

  constructor(
    public title: string,
    public options: NotificationOptions
  ) {
    FakeNotification.created.push(this);
  }

  static requestPermission = async () => FakeNotification.requestResult;

  close() {
    this.closed = true;
  }
}

const NOTIFICATION: TAppNotification = {
  title: 'Ana in #general',
  body: 'hello there',
  icon: 'https://chat.example.com/public/ana.png',
  target: { channelId: 3, messageId: 42, isDm: false }
};

const focus = mock(() => {});

const installWindow = (extra: Record<string, unknown> = {}) => {
  globalThis.window = {
    focus,
    Notification: FakeNotification,
    ...extra
  } as never;
  globalThis.Notification = FakeNotification as never;
};

describe('notifications', () => {
  beforeEach(() => {
    FakeNotification.permission = 'granted';
    FakeNotification.requestResult = 'granted';
    FakeNotification.created = [];
    focus.mockClear();
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { Notification?: unknown }).Notification;
  });

  describe('in the browser', () => {
    test('shows a browser notification with the title, body and icon', () => {
      installWindow();

      notify(NOTIFICATION);

      expect(FakeNotification.created).toHaveLength(1);

      const [shown] = FakeNotification.created;

      expect(shown.title).toBe('Ana in #general');
      expect(shown.options).toEqual({
        body: 'hello there',
        icon: 'https://chat.example.com/public/ana.png'
      });
    });

    test('shows nothing without permission', () => {
      installWindow();
      FakeNotification.permission = 'denied';

      notify(NOTIFICATION);

      expect(FakeNotification.created).toHaveLength(0);
    });

    test('a click focuses the window and reports where it leads', () => {
      installWindow();

      const listener = mock(() => {});
      const unsubscribe = onNotificationClick(listener);

      notify(NOTIFICATION);

      const [shown] = FakeNotification.created;

      shown.onclick?.();
      unsubscribe();

      expect(focus).toHaveBeenCalledTimes(1);
      expect(shown.closed).toBe(true);
      expect(listener).toHaveBeenCalledWith(NOTIFICATION.target);
    });

    test('a click on a notification without a target only focuses the window', () => {
      installWindow();

      const listener = mock(() => {});
      const unsubscribe = onNotificationClick(listener);
      const { target: _target, ...withoutTarget } = NOTIFICATION;

      notify(withoutTarget);
      FakeNotification.created[0].onclick?.();
      unsubscribe();

      expect(focus).toHaveBeenCalledTimes(1);
      expect(listener).not.toHaveBeenCalled();
    });

    test('a listener that unsubscribed is not told about clicks', () => {
      installWindow();

      const listener = mock(() => {});
      const unsubscribe = onNotificationClick(listener);

      unsubscribe();
      notify(NOTIFICATION);
      FakeNotification.created[0].onclick?.();

      expect(listener).not.toHaveBeenCalled();
    });

    test('permission follows what the user answered', async () => {
      installWindow();

      expect(await requestNotificationPermission()).toBe(true);

      FakeNotification.requestResult = 'denied';

      expect(await requestNotificationPermission()).toBe(false);
    });

    test('permission is refused where the browser has no notifications', async () => {
      globalThis.window = { focus } as never;

      expect(await requestNotificationPermission()).toBe(false);
    });
  });

  describe('in the desktop app', () => {
    test('hands the notification to the desktop app instead of the browser', () => {
      const showNotification = mock(() => {});

      installWindow({ sharkordDesktop: { showNotification } });

      notify(NOTIFICATION);

      expect(showNotification).toHaveBeenCalledWith(NOTIFICATION);
      expect(FakeNotification.created).toHaveLength(0);
    });

    test('clicks come from the desktop app', () => {
      const unsubscribe = mock(() => {});
      const desktopOnClick = mock(() => unsubscribe);

      installWindow({
        sharkordDesktop: {
          showNotification: mock(() => {}),
          onNotificationClick: desktopOnClick
        }
      });

      const listener = mock(() => {});

      expect(onNotificationClick(listener)).toBe(unsubscribe);
      expect(desktopOnClick).toHaveBeenCalledWith(listener);
    });

    test('permission is always granted, the os decides', async () => {
      installWindow({ sharkordDesktop: { showNotification: mock(() => {}) } });
      FakeNotification.requestResult = 'denied';

      expect(await requestNotificationPermission()).toBe(true);
    });
  });
});
