import {
  createPluginHandlerRegistry,
  type TPluginHandler
} from './plugin-handler-registry';

const pushRegistry = createPluginHandlerRegistry('push');

const onPluginPush = pushRegistry.on;
const dispatchPluginPush = pushRegistry.dispatch;

export { dispatchPluginPush, onPluginPush };
export type { TPluginHandler as TPushHandler };
