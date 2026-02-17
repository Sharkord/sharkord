import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getUrlFromServer } from '@/helpers/get-file-url';
import type {
  TCommandInfo,
  TCommandsMapByPlugin,
  TPluginComponentsMap,
  TSlots,
  TSlotsMapListByPlugin
} from '@sharkord/shared';
import { serverSliceActions } from '../slice';

export const setPluginCommands = (commands: TCommandsMapByPlugin) =>
  store.dispatch(serverSliceActions.setPluginCommands(commands));

export const addPluginCommand = (command: TCommandInfo) =>
  store.dispatch(serverSliceActions.addPluginCommand(command));

export const removePluginCommand = (commandName: string) =>
  store.dispatch(serverSliceActions.removePluginCommand({ commandName }));

export const addPluginComponents = (pluginId: string, slots: TSlots) =>
  store.dispatch(
    serverSliceActions.addPluginComponents({
      pluginId,
      slots
    })
  );

export const setPluginComponents = (components: TPluginComponentsMap) =>
  store.dispatch(serverSliceActions.setPluginComponents(components));

export const processPluginComponents = async (
  slotsMap: TSlotsMapListByPlugin
) => {
  const componentsMap: TPluginComponentsMap = {};

  for (const [pluginId, slots] of Object.entries(slotsMap)) {
    try {
      componentsMap[pluginId] = {};

      const moduleUrl = `${getUrlFromServer()}/plugin-bundle/${pluginId}/index.js`;
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
