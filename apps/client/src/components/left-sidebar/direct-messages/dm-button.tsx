import { setDmsOpen } from '@/features/app/actions';
import { useDmsOpen } from '@/features/app/hooks';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import { cn, Tooltip } from '@sharkord/ui';
import { MessageCircleMore, X } from 'lucide-react';
import { memo, useCallback } from 'react';

const DmButton = memo(() => {
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();
  const dmsOpen = useDmsOpen();

  const onToggleDmMode = useCallback(() => {
    setDmsOpen(!dmsOpen);
  }, [dmsOpen]);

  return (
    <div className="border-b border-border px-2 py-2">
      <Tooltip content={`${dmsOpen ? 'Close' : 'Open'} Direct Messages`}>
        <button
          type="button"
          onClick={onToggleDmMode}
          className={cn(
            'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            dmsOpen && 'bg-accent text-accent-foreground ring-1 ring-primary/30'
          )}
        >
          <MessageCircleMore className="h-4 w-4" />
          <span className="flex-1 text-left">Direct Messages</span>
          {dmsOpen && <X className="h-4 w-4" />}
          {directMessagesUnreadCount > 0 && (
            <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
              {directMessagesUnreadCount > 99
                ? '99+'
                : directMessagesUnreadCount}
            </div>
          )}
        </button>
      </Tooltip>
    </div>
  );
});

export { DmButton };
