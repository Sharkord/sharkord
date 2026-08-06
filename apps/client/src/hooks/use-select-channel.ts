import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { channelByIdSelector } from '@/features/server/channels/selectors';
import { joinVoice } from '@/features/server/voice/actions';
import { useVoice } from '@/features/server/voice/hooks';
import { store } from '@/features/store';
import { LocalStorageKey } from '@/helpers/storage';
import { ChannelType } from '@sharkord/shared';
import { useCallback } from 'react';
import { toast } from 'sonner';

// the single entry point for navigating to a channel, it also joins voice and
// remembers the last text channel, so never dispatch setSelectedChannelId directly
const useSelectChannel = () => {
  const { init } = useVoice();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  return useCallback(
    async (channelId: number) => {
      const channel = channelByIdSelector(store.getState(), channelId);

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
        channel.type === ChannelType.VOICE &&
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
    [currentVoiceChannelId, init]
  );
};

export { useSelectChannel };
