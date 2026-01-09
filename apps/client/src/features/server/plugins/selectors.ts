import type { IRootState } from '@/features/store';

export const commandsSelector = (state: IRootState) =>
  state.server.pluginCommands;
