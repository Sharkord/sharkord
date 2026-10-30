import { onPluginNotificationClick } from './notification-click-registry';
import type { TPluginHandler } from './plugin-handler-registry';
import { usePluginHandler } from './use-plugin-handler';

const usePluginNotificationClick = (handler: TPluginHandler) =>
  usePluginHandler(onPluginNotificationClick, handler);

export { usePluginNotificationClick };
