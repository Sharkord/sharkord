import { store } from '@/features/store';
import { logDebug } from '@/helpers/browser-logger';
import { getPluginBundleUrl } from '@/helpers/get-plugin-bundle-url';
import { i18n } from '@/i18n';
import {
  parsePluginTabs,
  PluginSlot,
  type TCommandsMapByPlugin,
  type TPluginComponentsMap,
  type TPluginComponentsMapBySlotId,
  type TPluginMetadata,
  type TPluginTabsMap
} from '@sharkord/shared';
import { toast } from 'sonner';
import { serverSliceActions } from '../slice';
import { pluginVersionByIdSelector } from './selectors';

export const setPluginsMetadata = (pluginsMetadata: TPluginMetadata[]) =>
  store.dispatch(serverSliceActions.setPluginsMetadata(pluginsMetadata));

export const setPluginCommands = (commands: TCommandsMapByPlugin) =>
  store.dispatch(serverSliceActions.setPluginCommands(commands));

export const setPluginComponents = (components: TPluginComponentsMap) =>
  store.dispatch(serverSliceActions.setPluginComponents(components));

export const setPluginTabs = (tabs: TPluginTabsMap) =>
  store.dispatch(serverSliceActions.setPluginTabs(tabs));

const parsePluginTabsAndWarn = (pluginId: string, value: unknown) => {
  const tabs = parsePluginTabs(value);
  const declared = Array.isArray(value) ? value.length : 0;

  if (declared > tabs.length) {
    console.warn(
      `Plugin ${pluginId}: ignored ${declared - tabs.length} of ${declared} tabs. A tab needs a unique non reserved id, a label, and a component.`
    );
  }

  if (tabs.length > 0) logDebug(`Loaded tabs for plugin ${pluginId}:`, tabs);

  return tabs;
};

export const loadPluginTabs = async (pluginId: string) => {
  const version = pluginVersionByIdSelector(store.getState(), pluginId);

  try {
    const mod = await import(
      /* @vite-ignore */ getPluginBundleUrl(pluginId, version)
    );

    store.dispatch(
      serverSliceActions.setPluginTabsForPlugin({
        pluginId,
        tabs: parsePluginTabsAndWarn(pluginId, mod?.tabs)
      })
    );
  } catch (error) {
    console.error(`Error loading tabs for plugin ${pluginId}:`, error);
  }
};

export const processPluginComponents = async (pluginIds: string[]) => {
  const componentsMap: TPluginComponentsMap = {};
  const tabsMap: TPluginTabsMap = {};

  const loadPlugin = async (pluginId: string) => {
    const slots: TPluginComponentsMapBySlotId = {};
    const version = pluginVersionByIdSelector(store.getState(), pluginId);
    const moduleUrl = getPluginBundleUrl(pluginId, version);

    logDebug(
      `Dynamically importing plugin module for plugin ${pluginId} from URL:`,
      moduleUrl
    );

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

    tabsMap[pluginId] = parsePluginTabsAndWarn(pluginId, mod?.tabs);

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

  setPluginTabs(tabsMap);

  return componentsMap;
};
