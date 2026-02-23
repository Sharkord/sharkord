import { PinnedMessageContext } from '@/components/pinned-message-provider/pinned-message-context';
import {
  useSelectedChannel,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { ChannelType } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo, useContext } from 'react';

const TopicTopbar = memo(() => {
  const selectedChannel = useSelectedChannel();
  const topic = selectedChannel?.topic || null;
  const pinnedMessage = useContext(PinnedMessageContext);
  const selectedChannelType = useSelectedChannelType();

  return (
    <aside
      className={cn(
        'h-12 border-b border-border bg-card',
        'w-auto overflow-hidden'
      )}
      style={{
        overflow: 'hidden'
      }}
    >
      <div className="p-1.5 text-sm text-foreground overflow-auto flex items-start">
        <div className="flex-1 p-2">{topic}</div>
        {selectedChannelType === ChannelType.TEXT && (
          <Tooltip
            content={
              pinnedMessage.visible
                ? 'Hide Pinned Messages'
                : 'Show Pinned Messages'
            }
          >
            <Button
              variant="ghost"
              onClick={() => pinnedMessage.setVisible(!pinnedMessage.visible)}
              className="
              self-start
              transition-colors duration-200
              hover:bg-neutral-700
              hover:text-foreground
              text-muted-foreground
            "
            >
              {pinnedMessage.visible ? <PinOff /> : <Pin />}
            </Button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
});

export { TopicTopbar };
