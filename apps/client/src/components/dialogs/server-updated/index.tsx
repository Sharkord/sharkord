import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

const ServerUpdatedDialog = memo(({ isOpen }: TDialogBaseProps) => {
  const { t } = useTranslation('dialogs');

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('serverUpdatedTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('serverUpdatedMsg')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleRefresh}>
            {t('serverUpdatedRefresh')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});

export { ServerUpdatedDialog };
