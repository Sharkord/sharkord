import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';
import type { PluginSlot, TPluginReactComponent } from '@sharkord/shared';

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

export const pluginComponentsBySlotSelector = (
  state: IRootState,
  slotId: PluginSlot
) => {
  const pluginComponents = pluginComponentsSelector(state);
  const componentsBySlot: Record<string, TPluginReactComponent[]> = {};

  for (const pluginId in pluginComponents) {
    const slots = pluginComponents[pluginId];

    if (slots && slots[slotId]) {
      componentsBySlot[pluginId] = slots[slotId] || [];
    }
  }

  return componentsBySlot;
};
