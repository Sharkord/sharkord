import { ResizableSidebar } from '@/components/resizable-sidebar';
import { useDmsOpen } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { memo } from 'react';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
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
      {publicSettings?.directMessagesEnabled && <DmButton />}
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
