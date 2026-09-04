import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useChannelsMap } from '@/features/server/channels/hooks';
import { setVoiceMoveTargetChannelId } from '@/features/server/voice/actions';
import { useVoiceMoveTargetChannelId } from '@/features/server/voice/hooks';
import {
  getLocalStorageItem,
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { useCallback, useEffect, useMemo, useState } from 'react';

const loadExpandedValue = (categoryId: number): boolean => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  return expandedMap?.[categoryId] ?? true;
};

const saveExpandedValue = (categoryId: number, expanded: boolean): void => {
  const expandedMap = getLocalStorageItemAsJSON<Record<number, boolean>>(
    LocalStorageKey.CATEGORIES_EXPANDED,
    {}
  );

  const newExpandedMap = {
    ...expandedMap,
    [categoryId]: expanded
  };

  setLocalStorageItemAsJSON(
    LocalStorageKey.CATEGORIES_EXPANDED,
    newExpandedMap
  );
};

const useCategoryExpanded = (categoryId: number) => {
  const [expanded, setExpanded] = useState(loadExpandedValue(categoryId));

  const toggleExpanded = useCallback(() => {
    setExpanded((prev) => {
      const newValue = !prev;

      saveExpandedValue(categoryId, newValue);

      return newValue;
    });
  }, [categoryId]);

  const expand = useCallback(() => {
    saveExpandedValue(categoryId, true);
    setExpanded(true);
  }, [categoryId]);

  return useMemo(
    () => ({ expand, expanded, toggleExpanded }),
    [expand, expanded, toggleExpanded]
  );
};

const useRestoreLastSelectedChannel = () => {
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const channelsMap = useChannelsMap();

  useEffect(() => {
    if (!autoJoinLastChannel) return;

    const lastSelectedChannelId = getLocalStorageItem(
      LocalStorageKey.LAST_SELECTED_CHANNEL
    );

    if (lastSelectedChannelId) {
      const channelId = parseInt(lastSelectedChannelId, 10);
      const lastChannel = channelsMap[channelId];

      if (lastChannel) {
        setSelectedChannelId(channelId);
      }
    }
  }, [channelsMap, autoJoinLastChannel]);
};

const useFollowVoiceMove = () => {
  const selectChannel = useSelectChannel();
  const voiceMoveTargetChannelId = useVoiceMoveTargetChannelId();

  useEffect(() => {
    if (voiceMoveTargetChannelId === undefined) return;

    setVoiceMoveTargetChannelId(undefined);
    selectChannel(voiceMoveTargetChannelId);
  }, [voiceMoveTargetChannelId, selectChannel]);
};

export {
  useCategoryExpanded,
  useFollowVoiceMove,
  useRestoreLastSelectedChannel
};
