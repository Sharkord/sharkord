import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import {
  PluginSlot,
  type TPluginReactComponent,
  type TPluginTab
} from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';

// stable empty value, so a plugin with no tabs does not re-render its view on
// every unrelated dispatch
const DEFAULT_TABS: TPluginTab[] = [];

export const pluginsMetadataSelector = (state: IRootState) =>
  state.server.pluginsMetadata;

export const pluginMetadataByIdSelector = createCachedSelector(
  pluginsMetadataSelector,
  (_: IRootState, pluginId: string | null) => pluginId,
  (pluginsMetadata, pluginId) =>
    pluginsMetadata.find((metadata) => metadata.pluginId === pluginId)
)((_state, pluginId) => pluginId);

export const pluginNamesSelector = createSelector(
  [pluginsMetadataSelector],
  (pluginsMetadata) => {
    const map: Record<string, string> = {};

    pluginsMetadata.forEach((metadata) => {
      map[metadata.pluginId] = metadata.name;
    });

    return map;
  }
);

export const pluginVersionByIdSelector = createCachedSelector(
  pluginMetadataByIdSelector,
  (metadata) => metadata?.version
)((_state, pluginId) => pluginId);

export const commandsSelector = (state: IRootState) =>
  state.server.pluginCommands;

export const pluginComponentsSelector = (state: IRootState) =>
  state.server.pluginComponents;

export const flatCommandsSelector = createSelector(
  [commandsSelector],
  (commandsMap) => {
    return Object.values(commandsMap).flat();
  }
);

export const pluginComponentsBySlotSelector = createCachedSelector(
  pluginComponentsSelector,
  (_: IRootState, slotId: PluginSlot) => slotId,
  (pluginComponents, slotId) => {
    const componentsBySlot: Record<string, TPluginReactComponent[]> = {};

    for (const pluginId in pluginComponents) {
      const slots = pluginComponents[pluginId];

      if (slots?.[slotId]) {
        componentsBySlot[pluginId] = slots[slotId];
      }
    }

    return componentsBySlot;
  }
)((_state, slotId) => slotId);

export const fullscreenPluginIdsSelector = createSelector(
  [
    (state: IRootState) =>
      pluginComponentsBySlotSelector(state, PluginSlot.FULL_SCREEN)
  ],
  (componentsMap) => Object.keys(componentsMap)
);

export const pluginTabsSelector = (state: IRootState) =>
  state.server.pluginTabs;

export const pluginTabsByIdSelector = createCachedSelector(
  pluginTabsSelector,
  (_: IRootState, pluginId: string) => pluginId,
  (pluginTabs, pluginId) => pluginTabs[pluginId] ?? DEFAULT_TABS
)((_state, pluginId) => pluginId);

const DEFAULT_SLOT_IDS: string[] = [];

export const pluginSlotIdsSelector = createCachedSelector(
  pluginComponentsSelector,
  (_: IRootState, pluginId: string) => pluginId,
  (pluginComponents, pluginId) => {
    const slots = Object.keys(pluginComponents[pluginId] ?? {});

    return slots.length > 0 ? slots : DEFAULT_SLOT_IDS;
  }
)((_state, pluginId) => pluginId);
