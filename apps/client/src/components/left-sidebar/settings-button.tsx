import { openServerScreen } from '@/features/server-screens/actions';
import { getDesktopApi } from '@/helpers/desktop-api';
import { TestId } from '@sharkord/shared';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@sharkord/ui';
import { Settings } from 'lucide-react';
import { forwardRef, memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ServerScreen } from '../server-screens/screens';

const SettingsIconButton = forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>((props, ref) => {
  const { t } = useTranslation('sidebar');

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 pointer-coarse:size-10"
      data-testid={TestId.USER_SETTINGS_TRIGGER}
      title={t('userSettings')}
      {...props}
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
});

const SettingsButton = memo(() => {
  const { t } = useTranslation('sidebar');
  const desktopApi = getDesktopApi();

  const handleUserSettingsClick = useCallback(() => {
    openServerScreen(ServerScreen.USER_SETTINGS);
  }, []);

  const handleDesktopSettingsClick = useCallback(() => {
    if (desktopApi) {
      desktopApi.openSettings();
    }
  }, [desktopApi]);

  if (!desktopApi) {
    return <SettingsIconButton onClick={handleUserSettingsClick} />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SettingsIconButton />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="top">
        <DropdownMenuItem onClick={handleUserSettingsClick}>
          {t('userSettings')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDesktopSettingsClick}>
          {t('topbar:desktopSettings')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export { SettingsButton };
