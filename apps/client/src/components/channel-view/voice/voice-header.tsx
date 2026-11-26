import { ContentHeader } from '@/components/content-header';
import { ContentHeaderTitle } from '@/components/content-header/content-header-title';
import {
  useChannelById,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { Volume2 } from 'lucide-react';
import { memo } from 'react';
import { VoiceButtons } from './voice-buttons';

type TVoiceHeaderProps = {
  channelId: number;
};

const VoiceHeader = memo(({ channelId }: TVoiceHeaderProps) => {
  const channel = useChannelById(channelId);
  const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();

  return (
    <ContentHeader
      actions={
        isCurrentVoiceChannelSelected && (
          <VoiceButtons currentVoiceChannelId={channelId} />
        )
      }
    >
      <ContentHeaderTitle icon={<Volume2 />}>
        {channel?.name}
      </ContentHeaderTitle>
    </ContentHeader>
  );
});

export { VoiceHeader };
