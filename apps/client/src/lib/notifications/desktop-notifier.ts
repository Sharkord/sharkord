import { getDesktopApi } from '@/helpers/desktop-api';
import type { TNotifier } from './types';

export const desktopNotifier: TNotifier = {
  requestPermission: async () => true,
  show: (notification) => {
    const desktopApi = getDesktopApi();

    if (!desktopApi) {
      return;
    }

    desktopApi.showNotification(notification);
  },
  onClick: (listener) => {
    const desktopApi = getDesktopApi();

    if (!desktopApi) {
      return () => {};
    }

    return desktopApi.onNotificationClick(listener);
  }
};
