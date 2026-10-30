import type { TAppNotification, TNotificationTarget } from '@sharkord/shared';

export type TNotificationClickListener = (target: TNotificationTarget) => void;

export type TNotifier = {
  requestPermission: () => Promise<boolean>;
  show: (notification: TAppNotification) => void;
  onClick: (listener: TNotificationClickListener) => () => void;
};
