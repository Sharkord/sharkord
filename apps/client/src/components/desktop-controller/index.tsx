import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import {
  useDesktopConnectionState,
  useTotalHasUnreadMentions,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { getDesktopApi } from '@/helpers/desktop-api';
import { memo, useEffect } from 'react';

const DesktopController = memo(() => {
  const desktopApi = getDesktopApi();
  const unreadCount = useTotalUnreadCount();
  const hasUnreadMentions = useTotalHasUnreadMentions();
  const connectionState = useDesktopConnectionState();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isInVoice = currentVoiceChannelId !== undefined;

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    desktopApi.setUnreadState({
      count: unreadCount,
      mentioned: hasUnreadMentions
    });
  }, [desktopApi, unreadCount, hasUnreadMentions]);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    desktopApi.setConnectionState(connectionState);
  }, [desktopApi, connectionState]);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    desktopApi.setVoiceActive(isInVoice);
  }, [desktopApi, isInVoice]);

  return null;
});

export { DesktopController };
