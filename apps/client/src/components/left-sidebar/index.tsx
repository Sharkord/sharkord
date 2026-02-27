import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setDmsOpen } from '@/features/app/actions';
import { useDmsOpen } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useDirectMessagesUnreadCount } from '@/features/server/channels/hooks';
import {
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import { MessageCircleMore } from 'lucide-react';
import { memo, useCallback } from 'react';
import { Protect } from '../protect';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { ServerDropdownMenu } from './server-dropdown';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 288; // w-72 = 288px

type TLeftSidebarProps = {
  className?: string;
};

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const serverName = useServerName();
  const dmsOpen = useDmsOpen();
  const publicSettings = usePublicServerSettings();
  const directMessagesUnreadCount = useDirectMessagesUnreadCount();

  const onToggleDmMode = useCallback(() => {
    setDmsOpen(!dmsOpen);
  }, [dmsOpen]);

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      className={cn('h-full', className)}
    >
      <div className="flex w-full justify-between h-12 items-center border-b border-border px-4">
        <h2
          className="font-semibold text-foreground truncate cursor-pointer"
          onClick={() => setSelectedChannelId(undefined)}
        >
          {serverName}
        </h2>
        <div>
          <ServerDropdownMenu />
        </div>
      </div>
      {publicSettings?.directMessagesEnabled && (
        <div className="border-b border-border px-2 py-2">
          <Protect permission={Permission.SEND_MESSAGES}>
            <button
              type="button"
              onClick={onToggleDmMode}
              className={cn(
                'flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                dmsOpen &&
                  'bg-accent text-accent-foreground ring-1 ring-primary/30'
              )}
            >
              <MessageCircleMore className="h-4 w-4" />
              <span className="flex-1 text-left">Direct Messages</span>
              {directMessagesUnreadCount > 0 && (
                <div className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
                  {directMessagesUnreadCount > 99
                    ? '99+'
                    : directMessagesUnreadCount}
                </div>
              )}
            </button>
          </Protect>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {dmsOpen ? <DirectMessages /> : <Categories />}
      </div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };
