import { useAutoJoinLastChannel } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useChannelsMap,
  useCurrentVoiceChannelId
} from '@/features/server/channels/hooks';
import { joinVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { getLocalStorageItemAsJSON, LocalStorageKey } from '@/helpers/storage';
import { ChannelType } from '@sharkord/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

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

  localStorage.setItem(
    LocalStorageKey.CATEGORIES_EXPANDED,
    JSON.stringify(newExpandedMap)
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

  return useMemo(
    () => ({ expanded, toggleExpanded }),
    [expanded, toggleExpanded]
  );
};

const useSelectChannel = () => {
  const { init } = useVoice();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const channelsMap = useChannelsMap();

  const selectChannel = useCallback(
    async (channelId: number) => {
      const channel = channelsMap[channelId];

      if (!channel) return;

      setSelectedChannelId(channel.id);

      if (channel.type !== ChannelType.VOICE) {
        // persist selected channel for non-voice channels
        localStorage.setItem(
          LocalStorageKey.LAST_SELECTED_CHANNEL,
          channel.id.toString()
        );
      }

      if (
        channel?.type === ChannelType.VOICE &&
        currentVoiceChannelId !== channel.id
      ) {
        const response = await joinVoice(channel.id);

        if (!response) {
          // joining voice failed
          setSelectedChannelId(undefined);
          toast.error('Failed to join voice channel');

          return;
        }

        try {
          await init(response, channel.id);
        } catch {
          setSelectedChannelId(undefined);
          toast.error('Failed to initialize voice connection');
        }
      }
    },
    [channelsMap, currentVoiceChannelId, init]
  );

  useEffect(() => {
    if (!autoJoinLastChannel) return;

    const lastSelectedChannelId = localStorage.getItem(
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

  return selectChannel;
};

export { useCategoryExpanded, useSelectChannel };
