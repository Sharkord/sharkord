import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { i18n } from '@/i18n';
import {
  CLIENT_ENTRY_FILE,
  PluginSlot,
  type TCommandsMapByPlugin,
  type TPluginComponentsMap,
  type TPluginComponentsMapBySlotId,
  type TPluginMetadata
} from '@sharkord/shared';
import { toast } from 'sonner';
import { serverSliceActions } from '../slice';

export const setPluginsMetadata = (pluginsMetadata: TPluginMetadata[]) =>
  store.dispatch(serverSliceActions.setPluginsMetadata(pluginsMetadata));

export const setPluginCommands = (commands: TCommandsMapByPlugin) =>
  store.dispatch(serverSliceActions.setPluginCommands(commands));

export const setPluginComponents = (components: TPluginComponentsMap) =>
  store.dispatch(serverSliceActions.setPluginComponents(components));

export const processPluginComponents = async (pluginIds: string[]) => {
  const componentsMap: TPluginComponentsMap = {};

  const loadPlugin = async (pluginId: string) => {
    const slots: TPluginComponentsMapBySlotId = {};
    const moduleUrl = `${getUrlFromServer()}/plugin-bundle/${pluginId}/${CLIENT_ENTRY_FILE}`;

    logDebug(
      `Dynamically importing plugin module for plugin ${pluginId} from URL:`,
      moduleUrl
    );

    // if you are developing, after making a change in the plugin you NEED to refresh the page to load the new version of the plugin, because of browser caching dynamic imports
    const mod = await import(/* @vite-ignore */ moduleUrl);

    logDebug('Loaded plugin module:', { pluginId, mod });

    for (const slotId of Object.values(PluginSlot)) {
      const components = mod?.components?.[slotId];

      if (components) {
        slots[slotId] = components;

        logDebug(`Loaded components for plugin ${pluginId} slot ${slotId}:`, {
          components
        });
      }
    }

    return slots;
  };

  const results = await Promise.allSettled(pluginIds.map(loadPlugin));

  results.forEach((result, index) => {
    const pluginId = pluginIds[index]!;

    componentsMap[pluginId] = {};

    if (result.status === 'fulfilled') {
      componentsMap[pluginId] = result.value;

      return;
    }

    console.error(`Error loading plugin ${pluginId}:`, result.reason);
    toast.error(i18n.t('common:failedLoadPluginUi', { pluginId }));
  });

  return componentsMap;
};
