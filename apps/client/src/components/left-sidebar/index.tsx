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
import { useServerName } from '@/features/server/hooks';
import { disconnect } from '@/lib/trpc';
import { Permission } from '@sharkord/shared';
import { Menu } from 'lucide-react';
import { memo } from 'react';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';
import { Button } from '../ui/button';
import { Categories } from './categories';
import { UserControl } from './user-control';
import { VoiceControl } from './voice-control';

const LeftSidebar = memo(() => {
  const serverName = useServerName();

  return (
    <aside className="flex w-72 flex-col border-r border-border bg-card">
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
              <Protect permission={Permission.MANAGE_SERVER}>
                <DropdownMenuItem
                  onClick={() => openDialog(Dialog.CREATE_CATEGORY)}
                >
                  Add Category
                </DropdownMenuItem>
              </Protect>
              <Protect permission={Permission.MANAGE_SERVER}>
                <DropdownMenuItem
                  onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
                >
                  Server Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </Protect>
              <DropdownMenuItem onClick={disconnect}>
                Disconnect
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Categories />
      </div>
      <VoiceControl />
      <UserControl />
    </aside>
  );
});

export { UserControl } from './user-control';
export { LeftSidebar };
