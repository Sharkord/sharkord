import { isDesktopApp } from '@/helpers/is-desktop-app';
import type { TAppNotification } from '@sharkord/shared';
import { desktopNotifier } from './desktop-notifier';
import type { TNotificationClickListener, TNotifier } from './types';
import { webNotifier } from './web-notifier';

const getNotifier = (): TNotifier => {
  if (isDesktopApp()) {
    return desktopNotifier;
  }

  return webNotifier;
};

export const notify = (notification: TAppNotification) => {
  const notifier = getNotifier();

  notifier.show(notification);
};

export const requestNotificationPermission = () => {
  const notifier = getNotifier();

  return notifier.requestPermission();
};

export const onNotificationClick = (listener: TNotificationClickListener) => {
  const notifier = getNotifier();

  return notifier.onClick(listener);
};
