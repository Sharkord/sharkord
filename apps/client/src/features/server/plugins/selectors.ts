import type { IRootState } from '@/features/store';
import { createSelector } from '@reduxjs/toolkit';

export const commandsSelector = (state: IRootState) =>
  state.server.pluginCommands;

export const flatCommandsSelector = createSelector(
  [commandsSelector],
  (commandsMap) => {
    return Object.values(commandsMap).flat();
  }
);
