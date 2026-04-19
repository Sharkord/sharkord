import type { IRootState } from '@/features/store';
import type { PluginSlot } from '@sharkord/shared';
import { useSelector } from 'react-redux';
import {
  commandsSelector,
  flatCommandsSelector,
  fullscreenPluginIdsSelector,
  pluginComponentsBySlotSelector,
  pluginMetadataByIdSelector
} from './selectors';

export const usePluginCommands = () => useSelector(commandsSelector);

export const useFlatPluginCommands = () => useSelector(flatCommandsSelector);

export const usePluginComponentsBySlot = (slotId: PluginSlot) =>
  useSelector((state: IRootState) =>
    pluginComponentsBySlotSelector(state, slotId)
  );

export const usePluginMetadata = (pluginId: string | null | undefined) =>
  useSelector((state: IRootState) =>
    pluginId ? pluginMetadataByIdSelector(state, pluginId) : undefined
  );

export const useFullscreenPluginIds = () =>
  useSelector(fullscreenPluginIdsSelector);
