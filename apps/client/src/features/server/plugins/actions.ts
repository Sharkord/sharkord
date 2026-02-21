import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getUrlFromServer } from '@/helpers/get-file-url';
import type {
  TCommandInfo,
  TCommandsMapByPlugin,
  TPluginComponentsMap,
  TPluginComponentsMapBySlotId,
  TPluginComponentsMapBySlotIdMapListByPlugin
} from '@sharkord/shared';
import { serverSliceActions } from '../slice';

export const setPluginCommands = (commands: TCommandsMapByPlugin) =>
  store.dispatch(serverSliceActions.setPluginCommands(commands));

export const addPluginCommand = (command: TCommandInfo) =>
  store.dispatch(serverSliceActions.addPluginCommand(command));

export const removePluginCommand = (commandName: string) =>
  store.dispatch(serverSliceActions.removePluginCommand({ commandName }));

export const addPluginComponents = (
  pluginId: string,
  slots: TPluginComponentsMapBySlotId
) =>
  store.dispatch(
    serverSliceActions.addPluginComponents({
      pluginId,
      slots
    })
  );

export const setPluginComponents = (components: TPluginComponentsMap) =>
  store.dispatch(serverSliceActions.setPluginComponents(components));

export const processPluginComponents = async (
  slotsMap: TPluginComponentsMapBySlotIdMapListByPlugin
) => {
  const componentsMap: TPluginComponentsMap = {};

  for (const [pluginId, slots] of Object.entries(slotsMap)) {
    try {
      componentsMap[pluginId] = {};

      const moduleUrl = `${getUrlFromServer()}/plugin-bundle/${pluginId}/index.js`;

      // if you are developing, after making a change in the plugin you NEED to refresh the page to load the new version of the plugin, because of browser caching dynamic imports
      const mod = await import(/* @vite-ignore */ moduleUrl);

      logDebug('Loaded plugin module:', { pluginId, mod });

      for (const slotId of slots) {
        const components = mod?.components?.[slotId];

        if (components) {
          componentsMap[pluginId][slotId] = components;

          logDebug(`Loaded components for plugin ${pluginId} slot ${slotId}:`, {
            components
          });
        }
      }
    } catch (error) {
      console.error(`Error loading plugin ${pluginId}:`, error);
    }
  }

  return componentsMap;
};
