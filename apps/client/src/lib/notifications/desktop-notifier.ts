import type { TNotifier } from './types';

export const desktopNotifier: TNotifier = {
  requestPermission: async () => true,
  show: (notification) => {
    const desktopApi = window.sharkordDesktop;

    if (!desktopApi) {
      return;
    }

    desktopApi.showNotification(notification);
  },
  onClick: (listener) => {
    const desktopApi = window.sharkordDesktop;

    if (!desktopApi) {
      return () => {};
    }

    return desktopApi.onNotificationClick(listener);
  }
};
