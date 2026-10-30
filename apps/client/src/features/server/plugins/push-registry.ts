type TPushHandler = (data: unknown) => void;

const handlers = new Map<string, Set<TPushHandler>>();

const onPluginPush = (pluginId: string, handler: TPushHandler) => {
  const existing = handlers.get(pluginId) ?? new Set<TPushHandler>();

  existing.add(handler);
  handlers.set(pluginId, existing);

  return () => {
    const current = handlers.get(pluginId);

    if (!current) return;

    current.delete(handler);

    if (current.size === 0) handlers.delete(pluginId);
  };
};

const dispatchPluginPush = (pluginId: string, data: unknown) => {
  handlers.get(pluginId)?.forEach((handler) => {
    try {
      handler(data);
    } catch (error) {
      console.error(`Plugin ${pluginId} push handler failed:`, error);
    }
  });
};

export { dispatchPluginPush, onPluginPush };
export type { TPushHandler };
