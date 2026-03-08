import { openDialog } from '@/features/dialogs/actions';
import { openServerScreen } from '@/features/server-screens/actions';
import { disconnectFromServer } from '@/features/server/actions';
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

const ServerDropdownMenu = memo(() => {
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
          <DropdownMenuItem onClick={() => openDialog(Dialog.CREATE_CATEGORY)}>
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
  );
});

export { ServerDropdownMenu };
