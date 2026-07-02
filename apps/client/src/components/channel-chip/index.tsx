import { useChannelById, useSelectedChannelId } from '@/features/server/channels/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { cn } from '@/lib/utils';
import { memo, useCallback } from 'react';

type TChannelChipProps = {
  channelId: number;
  label?: string;
};

const ChannelChip = memo(
  ({ channelId, label: labelProp }: TChannelChipProps) => {
    const channel = useChannelById(channelId);
    const selectedChannelId = useSelectedChannelId();
    const isCurrentChannel = selectedChannelId === channelId;
    const label = labelProp ?? channel?.name ?? 'Unknown Channel';

    const handleClick = useCallback(() => {
      setSelectedChannelId(channelId);
    }, [channelId]);

    return (
      <span
        onClick={handleClick}
        className={cn(
          'channel-reference rounded px-0.5 cursor-pointer transition-colors',
          isCurrentChannel
            ? 'text-primary bg-primary/10 font-medium'
            : 'text-primary/80 bg-primary/5 hover:bg-primary/15'
        )}
      >
        #{label}
      </span>
    );
  }
);

export { ChannelChip };
