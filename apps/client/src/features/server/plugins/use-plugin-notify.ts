import type { TPluginNotification } from '@sharkord/shared';
import { useCallback } from 'react';
import { sendPluginNotification } from './actions';
import { usePluginId } from './plugin-id-context';

const usePluginNotify = () => {
  const pluginId = usePluginId();

  return useCallback(
    (notification: TPluginNotification) => {
      if (!pluginId) return;

      sendPluginNotification(pluginId, notification);
    },
    [pluginId]
  );
};

export { usePluginNotify };
