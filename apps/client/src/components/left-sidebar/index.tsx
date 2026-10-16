import { ResizableSidebar } from '@/components/resizable-sidebar';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useDmsOpen,
  usePublicServerSettings,
  useServerName
} from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { cn } from '@/lib/utils';
import { TestId } from '@sharkord/shared';
import { memo } from 'react';
import { Categories } from './categories';
import { DirectMessages } from './direct-messages';
import { DmButton } from './direct-messages/dm-button';
import { useFollowVoiceMove, useRestoreLastSelectedChannel } from './hooks';
import { PluginButtons } from './plugin-buttons';
import { ServerDropdownMenu } from './server-dropdown';
import { Threads } from './threads';
import { ThreadsButton } from './threads/threads-button';
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
  const threadsOpen = useThreadsOpen();
  const publicSettings = usePublicServerSettings();

  useRestoreLastSelectedChannel();
  useFollowVoiceMove();

  let content = <Categories />;

  if (threadsOpen) {
    content = <Threads />;
  } else if (dmsOpen) {
    content = <DirectMessages />;
  }

  return (
    <ResizableSidebar
      storageKey={LocalStorageKey.LEFT_SIDEBAR_WIDTH}
      minWidth={MIN_WIDTH}
      maxWidth={MAX_WIDTH}
      defaultWidth={DEFAULT_WIDTH}
      edge="right"
      className={cn('h-full', className)}
      data-testid={TestId.LEFT_SIDEBAR}
    >
      <div className="flex w-full justify-between h-12 items-center border-b border-border px-4">
        <h2
          className="font-semibold text-foreground truncate cursor-pointer"
          onClick={() => setSelectedChannelId(undefined)}
          data-testid={TestId.LEFT_SIDEBAR_SERVER_NAME}
        >
          {serverName}
        </h2>
        <div>
          <ServerDropdownMenu />
        </div>
      </div>
      <div className="space-y-0.5 border-b border-border px-2 py-2">
        {publicSettings?.directMessagesEnabled && <DmButton />}
        <ThreadsButton />
      </div>
      <PluginButtons />
      <div className="flex-1 overflow-y-auto">{content}</div>
      <VoiceControl />
      <UserControl />
    </ResizableSidebar>
  );
});

export { LeftSidebar };
