const PLUGIN_NOTIFICATION_LIMIT = 5;
const PLUGIN_NOTIFICATION_WINDOW_MS = 5_000;

const recentByPlugin = new Map<string, number[]>();

const takePluginNotificationSlot = (pluginId: string, now: number) => {
  const recent = (recentByPlugin.get(pluginId) ?? []).filter(
    (sentAt) => now - sentAt < PLUGIN_NOTIFICATION_WINDOW_MS
  );

  if (recent.length >= PLUGIN_NOTIFICATION_LIMIT) {
    recentByPlugin.set(pluginId, recent);

    return false;
  }

  recentByPlugin.set(pluginId, [...recent, now]);

  return true;
};

export {
  PLUGIN_NOTIFICATION_LIMIT,
  PLUGIN_NOTIFICATION_WINDOW_MS,
  takePluginNotificationSlot
};
