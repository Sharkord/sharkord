type TPluginHandler = (data: unknown) => void;

const createPluginHandlerRegistry = (label: string) => {
  const handlers = new Map<string, Set<TPluginHandler>>();

  const on = (pluginId: string, handler: TPluginHandler) => {
    const existing = handlers.get(pluginId) ?? new Set<TPluginHandler>();

    existing.add(handler);
    handlers.set(pluginId, existing);

    return () => {
      const current = handlers.get(pluginId);

      if (!current) return;

      current.delete(handler);

      if (current.size === 0) handlers.delete(pluginId);
    };
  };

  const dispatch = (pluginId: string, data: unknown) => {
    handlers.get(pluginId)?.forEach((handler) => {
      try {
        handler(data);
      } catch (error) {
        console.error(`Plugin ${pluginId} ${label} handler failed:`, error);
      }
    });
  };

  return { on, dispatch };
};

export { createPluginHandlerRegistry };
export type { TPluginHandler };
