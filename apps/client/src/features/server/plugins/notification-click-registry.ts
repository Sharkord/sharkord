import { createPluginHandlerRegistry } from './plugin-handler-registry';

const notificationClickRegistry =
  createPluginHandlerRegistry('notification click');

const onPluginNotificationClick = notificationClickRegistry.on;
const dispatchPluginNotificationClick = notificationClickRegistry.dispatch;

export { dispatchPluginNotificationClick, onPluginNotificationClick };
