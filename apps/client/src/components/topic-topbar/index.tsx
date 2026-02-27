import {
  closePinnedMessagesBox,
  openPinnedMessagesBox
} from '@/features/app/actions';
import { usePinnedMessagesBox } from '@/features/app/hooks';
import {
  useSelectedChannel,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { ChannelType } from '@sharkord/shared';
import { Button, Tooltip } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo } from 'react';
import { useDispatch } from 'react-redux';

const TopicTopbar = memo(() => {
  const selectedChannel = useSelectedChannel();
  const topic = selectedChannel?.topic || null;
  const selectedChannelType = useSelectedChannelType();

  const dispatch = useDispatch();
  const isOpen = usePinnedMessagesBox();

  const togglePinnedMessagesBox = () => {
    dispatch(isOpen ? closePinnedMessagesBox() : openPinnedMessagesBox());
  };

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
            content={isOpen ? 'Hide Pinned Messages' : 'Show Pinned Messages'}
          >
            <Button
              variant="ghost"
              onClick={togglePinnedMessagesBox}
              className="
              self-start
              transition-colors duration-200
              hover:bg-neutral-700
              hover:text-foreground
              text-muted-foreground
            "
            >
              {isOpen ? <PinOff /> : <Pin />}
            </Button>
          </Tooltip>
        )}
      </div>
    </aside>
  );
});

export { TopicTopbar };
