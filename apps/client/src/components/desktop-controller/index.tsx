import { useAudioLevel } from '@/components/channel-view/voice/hooks/use-audio-level';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import {
  useDesktopConnectionState,
  useTotalHasUnreadMentions,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { useOwnVoiceState, useVoice } from '@/features/server/voice/hooks';
import { getDesktopApi } from '@/helpers/desktop-api';
import { StreamKind } from '@sharkord/shared';
import { memo, useEffect, useMemo } from 'react';

const DesktopController = memo(() => {
  const desktopApi = getDesktopApi();
  const unreadCount = useTotalUnreadCount();
  const hasUnreadMentions = useTotalHasUnreadMentions();
  const connectionState = useDesktopConnectionState();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isInVoice = currentVoiceChannelId !== undefined;
  const { localAudioStream, remoteUserStreams } = useVoice();
  const { micMuted, soundMuted, serverMuted } = useOwnVoiceState();

  const selfAudioStream = useMemo(
    () =>
      isInVoice && !micMuted && !serverMuted ? localAudioStream : undefined,
    [isInVoice, micMuted, serverMuted, localAudioStream]
  );

  const remoteAudioStreams = useMemo(() => {
    if (!isInVoice || soundMuted) {
      return undefined;
    }

    const streams: MediaStream[] = [];

    for (const userStreams of Object.values(remoteUserStreams)) {
      const audio = userStreams?.[StreamKind.AUDIO];

      if (audio) {
        streams.push(audio);
      }
    }

    return streams.length > 0 ? streams : undefined;
  }, [isInVoice, soundMuted, remoteUserStreams]);

  const { isSpeaking: isSelfSpeaking } = useAudioLevel(selfAudioStream);
  const { isSpeaking: isOthersSpeaking } = useAudioLevel(remoteAudioStreams);

  const selfSpeaking = isInVoice && !micMuted && !serverMuted && isSelfSpeaking;
  const othersSpeaking = isInVoice && !soundMuted && isOthersSpeaking;

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

  useEffect(() => {
    if (!desktopApi?.setVoiceSpeaking) {
      return;
    }

    desktopApi.setVoiceSpeaking({
      selfSpeaking,
      othersSpeaking
    });
  }, [desktopApi, selfSpeaking, othersSpeaking]);

  return null;
});

export { DesktopController };
