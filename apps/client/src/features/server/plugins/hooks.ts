import type { IRootState } from '@/features/store';
import type { PluginSlot } from '@sharkord/shared';
import { useSelector } from 'react-redux';
import {
  commandsSelector,
  flatCommandsSelector,
  pluginComponentsBySlotSelector
} from './selectors';

export const usePluginCommands = () => useSelector(commandsSelector);

export const useFlatPluginCommands = () => useSelector(flatCommandsSelector);

export const usePluginComponentsBySlot = (slotId: PluginSlot) =>
  useSelector((state: IRootState) =>
    pluginComponentsBySlotSelector(state, slotId)
  );
