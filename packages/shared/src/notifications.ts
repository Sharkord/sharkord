export type TMessageNotificationTarget = {
  type: 'message';
  channelId: number;
  messageId: number;
  parentMessageId?: number;
  isDm: boolean;
};

export type TPluginNotificationTarget = {
  type: 'plugin';
  pluginId: string;
  data?: unknown;
};

export type TNotificationTarget =
  | TMessageNotificationTarget
  | TPluginNotificationTarget;

export type TAppNotification = {
  title: string;
  body: string;
  icon?: string;
  target?: TNotificationTarget;
};

export type TPluginNotification = {
  title: string;
  body: string;
  icon?: string;
  data?: unknown;
};
