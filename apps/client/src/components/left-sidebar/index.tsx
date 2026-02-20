import { openDialog } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { useServerName } from '@/features/server/hooks';
import { LocalStorageKey } from '@/helpers/storage';
import { useResizableSidebar } from '@/hooks/use-resizable-sidebar';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@sharkord/ui';
import { Menu } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';
import { Categories } from './categories';
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
  const { width, isResizing, sidebarRef, handleMouseDown } =
    useResizableSidebar({
      storageKey: LocalStorageKey.LEFT_SIDEBAR_WIDTH,
      minWidth: MIN_WIDTH,
      maxWidth: MAX_WIDTH,
      defaultWidth: DEFAULT_WIDTH,
      edge: 'right'
    });
  const serverSettingsPermissions = useMemo(
    () => [
      Permission.MANAGE_SETTINGS,
      Permission.MANAGE_ROLES,
      Permission.MANAGE_EMOJIS,
      Permission.MANAGE_STORAGE,
      Permission.MANAGE_USERS,
      Permission.MANAGE_INVITES,
      Permission.MANAGE_UPDATES
    ],
    []
  );

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        'flex flex-col border-r border-border bg-card h-full relative',
        !isResizing && 'transition-all duration-500 ease-in-out',
        className
      )}
      style={{ width: `${width}px` }}
    >
      <div className="flex w-full justify-between h-12 items-center border-b border-border px-4">
        <h2 className="font-semibold text-foreground truncate">{serverName}</h2>
        <div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Server</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Protect permission={Permission.MANAGE_CATEGORIES}>
                <DropdownMenuItem
                  onClick={() => openDialog(Dialog.CREATE_CATEGORY)}
                >
                  Add Category
                </DropdownMenuItem>
              </Protect>
              <Protect permission={serverSettingsPermissions}>
                <DropdownMenuItem
                  onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
                >
                  Server Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Protect>
              <DropdownMenuItem onClick={disconnectFromServer}>
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Categories />
      </div>
      <VoiceControl />
      <UserControl />
      <div
        className={cn(
          'absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors z-50',
          isResizing && 'bg-primary'
        )}
        onMouseDown={handleMouseDown}
      />
    </aside>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };
