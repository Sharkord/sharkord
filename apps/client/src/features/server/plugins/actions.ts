import { store } from '@/features/store';
import type { TCommandInfo, TCommandsMapByPlugin } from '@sharkord/shared';
import { serverSliceActions } from '../slice';

export const setPluginCommands = (commands: TCommandsMapByPlugin) =>
  store.dispatch(serverSliceActions.setPluginCommands(commands));

export const addPluginCommand = (command: TCommandInfo) =>
  store.dispatch(serverSliceActions.addPluginCommand(command));

export const removePluginCommand = (commandName: string) =>
  store.dispatch(serverSliceActions.removePluginCommand({ commandName }));
