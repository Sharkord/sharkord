import { useEffect, useRef } from 'react';
import { usePluginId } from './plugin-id-context';
import { onPluginPush, type TPushHandler } from './push-registry';

const usePluginPush = (handler: TPushHandler) => {
  const pluginId = usePluginId();
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!pluginId) return;

    return onPluginPush(pluginId, (data) => handlerRef.current(data));
  }, [pluginId]);
};

export { usePluginPush };
