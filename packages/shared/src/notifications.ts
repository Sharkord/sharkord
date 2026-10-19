// where a notification leads when clicked, the same on every platform
export type TNotificationTarget = {
  channelId: number;
  messageId: number;
  parentMessageId?: number;
  isDm: boolean;
};

export type TAppNotification = {
  title: string;
  body: string;
  icon?: string;
  target?: TNotificationTarget;
};
