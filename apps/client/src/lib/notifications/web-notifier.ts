import type { TNotificationClickListener, TNotifier } from './types';

const listeners = new Set<TNotificationClickListener>();

const isSupported = () => 'Notification' in window;

export const webNotifier: TNotifier = {
  requestPermission: async () => {
    if (!isSupported()) {
      return false;
    }

    const permission = await Notification.requestPermission();

    return permission === 'granted';
  },
  show: ({ title, body, icon, target }) => {
    if (!isSupported() || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification(title, { body, icon });

    notification.onclick = () => {
      window.focus();
      notification.close();

      if (!target) {
        return;
      }

      for (const listener of listeners) {
        listener(target);
      }
    };
  },
  onClick: (listener) => {
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }
};
