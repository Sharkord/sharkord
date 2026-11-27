import { useDesktopServerList } from '@/hooks/use-desktop-server-list';
import { DropdownMenuItem, DropdownMenuSeparator } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const ServerListMenuItem = memo(() => {
  const { t } = useTranslation('topbar');
  const { isDesktop, isVisible, toggle } = useDesktopServerList();

  if (!isDesktop) return null;

  return (
    <>
      <DropdownMenuItem onClick={toggle}>
        {isVisible ? t('closeServerList') : t('openServerList')}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  );
});

export { ServerListMenuItem };
