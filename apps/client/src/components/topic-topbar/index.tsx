import { PinnedMessageContext } from '@/components/pinned-message-provider';
import { useSelectedChannel } from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { IconButton } from '@sharkord/ui';
import { Pin, PinOff } from 'lucide-react';
import { memo, useContext } from 'react';

const TopicTopbar = memo(() => {
  const selectedChannel = useSelectedChannel();
  const topic = selectedChannel?.topic || null;
  const pinnedMessage = useContext(PinnedMessageContext);

  return (
    <aside
      className={cn(
        'sticky inset-0',
        'bg-neutral-800 rounded-xl shadow-md border border-neutral-700 mx-2 mt-2',
        'left-2 right-2 w-auto overflow-hidden'
      )}
      style={{
        overflow: 'hidden'
      }}
    >
      <div className="p-4 text-sm text-foreground overflow-auto flex items-start">
        <div className="flex-1">{topic}</div>
        <IconButton
          role="button"
          onClick={() => pinnedMessage?.setVisible(!pinnedMessage.visible)}
          className="text-muted-foreground rounded h-6 w-6 px-2 text-xs cursor-pointer"
          icon={pinnedMessage?.visible ? PinOff : Pin}
          title={
            pinnedMessage?.visible
              ? 'Hide Pinned Messages'
              : 'Show Pinned Messages'
          }
        />
      </div>
    </aside>
  );
});

export { TopicTopbar };
