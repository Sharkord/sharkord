import { Button } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TUpdateStatus } from '../../shared/types';

type TUpdateActionProps = {
  status: TUpdateStatus;
};

const UpdateAction = memo(({ status }: TUpdateActionProps) => {
  const { t } = useTranslation();

  const handleCheck = useCallback(() => {
    window.desktop.checkForUpdates();
  }, []);

  const handleDownload = useCallback(() => {
    window.desktop.downloadUpdate();
  }, []);

  const handleInstall = useCallback(() => {
    window.desktop.installUpdate();
  }, []);

  switch (status) {
    case 'unsupported':
    case 'checking':
    case 'downloading':
      return null;
    case 'available':
      return (
        <Button onClick={handleDownload}>{t('settings.downloadUpdate')}</Button>
      );
    case 'ready':
      return (
        <Button onClick={handleInstall}>{t('settings.installUpdate')}</Button>
      );
    default:
      return (
        <Button variant="outline" onClick={handleCheck}>
          {t('settings.checkForUpdates')}
        </Button>
      );
  }
});

export { UpdateAction };
