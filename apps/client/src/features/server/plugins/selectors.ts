import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import type { PluginSlot, TPluginReactComponent } from '@sharkord/shared';
import { createCachedSelector } from 're-reselect';

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
