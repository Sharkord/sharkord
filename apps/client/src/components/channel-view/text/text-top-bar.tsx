import { useChannelById } from '@/features/server/channels/hooks';
import { ChannelType } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Hash, Volume2, X } from 'lucide-react';
import { memo, useMemo } from 'react';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
  channelId: number;
  onClose?: () => void;
};

const TextTopbar = memo(
  ({ onScrollToMessage, channelId, onClose }: TTextTopbarProps) => {
    const channel = useChannelById(channelId);

    const info = useMemo(() => {
      if (channel?.isDm) {
        return {
          name: 'Direct Message',
          topic:
            'This is a direct message channel for conversations between you and the recipient.'
        };
      }

      return {
        name: channel?.name,
        topic: channel?.topic
      };
    }, [channel]);

    return (
      <div className="flex h-12 border-b border-border bg-card w-auto overflow-hidden">
        <div className="flex w-full items-center justify-between px-4">
          <div className="flex items-center gap-2 min-w-0">
            {channel?.type === ChannelType.TEXT ? (
              <Hash className="inline-block text-muted-foreground h-4 w-4" />
            ) : (
              <Volume2 className="inline-block text-muted-foreground h-4 w-4" />
            )}
            <span className="font-bold truncate max-w-40">{info.name}</span>
            {info.topic && (
              <span className="text-xs text-muted-foreground truncate">
                {info.topic}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />
            {onClose && (
              <IconButton
                onClick={onClose}
                icon={X}
                variant="ghost"
                size="sm"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

export { TextTopbar };
