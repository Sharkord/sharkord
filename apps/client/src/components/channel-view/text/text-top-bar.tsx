import { useSelectedChannel } from '@/features/server/channels/hooks';
import { Hash } from 'lucide-react';
import { memo } from 'react';
import { PinnedMessagesPopover } from './pinned-messages-popover';

type TTextTopbarProps = {
  onScrollToMessage: (messageId: number) => Promise<void>;
};

const TextTopbar = memo(({ onScrollToMessage }: TTextTopbarProps) => {
  const selectedChannel = useSelectedChannel();

  return (
    <div className="flex h-12 border-b border-border bg-card w-auto overflow-hidden">
      <div className="flex w-full items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="inline-block text-muted-foreground" size={16} />
          <span className="font-bold truncate max-w-40">
            {selectedChannel?.name || 'No topic'}
          </span>
          {selectedChannel?.topic && (
            <span className="text-xs text-muted-foreground truncate max-w-60">
              {selectedChannel.topic}
            </span>
          )}
        </div>
        <PinnedMessagesPopover onScrollToMessage={onScrollToMessage} />
      </div>
    </div>
  );
});

export { TextTopbar };
