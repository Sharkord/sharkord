import { onPluginPush, type TPushHandler } from './push-registry';
import { usePluginHandler } from './use-plugin-handler';

const usePluginPush = (handler: TPushHandler) =>
  usePluginHandler(onPluginPush, handler);

export { usePluginPush };
