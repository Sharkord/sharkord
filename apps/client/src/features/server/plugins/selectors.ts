import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import { PluginSlot, type TPluginReactComponent } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';

export const pluginsMetadataSelector = (state: IRootState) =>
  state.server.pluginsMetadata;

export const pluginMetadataByIdSelector = createCachedSelector(
  pluginsMetadataSelector,
  (_: IRootState, pluginId: string | null) => pluginId,
  (pluginsMetadata, pluginId) =>
    pluginsMetadata.find((metadata) => metadata.pluginId === pluginId)
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
