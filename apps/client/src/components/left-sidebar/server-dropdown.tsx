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
import { useTranslation } from 'react-i18next';
import { Dialog } from '../dialogs/dialogs';
import { Protect } from '../protect';
import { ServerScreen } from '../server-screens/screens';

const ServerDropdownMenu = memo(() => {
  const { t } = useTranslation('sidebar');
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
        <DropdownMenuLabel>{t('server')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Protect permission={Permission.MANAGE_CATEGORIES}>
          <DropdownMenuItem onClick={() => openDialog(Dialog.CREATE_CATEGORY)}>
            {t('addCategory')}
          </DropdownMenuItem>
        </Protect>
        <Protect permission={serverSettingsPermissions}>
          <DropdownMenuItem
            onClick={() => openServerScreen(ServerScreen.SERVER_SETTINGS)}
          >
            {t('serverSettings')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </Protect>
        <DropdownMenuItem onClick={disconnectFromServer}>
          {t('disconnect')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { ServerDropdownMenu };
