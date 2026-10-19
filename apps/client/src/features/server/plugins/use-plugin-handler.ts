import { useEffect, useRef } from 'react';
import type { TPluginHandler } from './plugin-handler-registry';
import { usePluginId } from './plugin-id-context';

const usePluginHandler = (
  on: (pluginId: string, handler: TPluginHandler) => () => void,
  handler: TPluginHandler
) => {
  const pluginId = usePluginId();
  const handlerRef = useRef(handler);

  handlerRef.current = handler;

  useEffect(() => {
    if (!pluginId) return;

    return on(pluginId, (data) => handlerRef.current(data));
  }, [on, pluginId]);
};

export { usePluginHandler };
