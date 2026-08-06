import {
  useChannelById,
  useSelectedChannelId
} from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { useSelectChannel } from '@/hooks/use-select-channel';
import { cn } from '@/lib/utils';
import { ChannelPermission } from '@sharkord/shared';
import { memo, useCallback, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

type TChannelChipProps = {
  channelId: number;
};

const ChannelChip = memo(({ channelId }: TChannelChipProps) => {
  const { t } = useTranslation('common');
  const channel = useChannelById(channelId);
  const channelCan = useChannelCan(channelId);
  const selectedChannelId = useSelectedChannelId();
  const selectChannel = useSelectChannel();
  const isCurrentChannel = selectedChannelId === channelId;

  const handleClick = useCallback(() => {
    selectChannel(channelId);
  }, [channelId, selectChannel]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;

      event.preventDefault();
      selectChannel(channelId);
    },
    [channelId, selectChannel]
  );

  if (!channel || !channelCan(ChannelPermission.VIEW_CHANNEL)) {
    return <span>#{t('unknownChannel')}</span>;
  }

  return (
    <span
      role="link"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'channel-reference rounded px-0.5 cursor-pointer transition-colors',
        isCurrentChannel
          ? 'text-primary bg-primary/10 font-medium'
          : 'text-primary/80 bg-primary/5 hover:bg-primary/15'
      )}
    >
      #{channel.name}
    </span>
  );
});

export { ChannelChip };
