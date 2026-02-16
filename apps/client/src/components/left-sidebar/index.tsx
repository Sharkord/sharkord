import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { openDialog } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
import { useServerName } from '@/features/server/hooks';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import { Menu } from 'lucide-react';
import { memo, useMemo } from 'react';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';
import { Button } from '../ui/button';
import { Categories } from './categories';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';
import { useChannels } from '@/features/server/channels/hooks';
import { Channels } from './channels';

type TLeftSidebarProps = {
  className?: string;
};

const LeftSidebar = memo(({ className }: TLeftSidebarProps) => {
  const serverName = useServerName();
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
      className={cn(
        'flex w-72 flex-col border-r border-border bg-card h-full',
        className
      )}
    >
      <div className="flex w-full justify-between h-12 items-center border-b border-border px-4">
        <h2 className="font-semibold text-foreground">{serverName}</h2>
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
              <Protect permission={Permission.MANAGE_CHANNELS}>
                <DropdownMenuItem
                  onClick={() => openDialog(Dialog.CREATE_CHANNEL)}
                >
                  Add Channel
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
        {<Channels categoryId={null} />}
        <Categories />
      </div>
      <VoiceControl />
      <UserControl />
    </aside>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };
