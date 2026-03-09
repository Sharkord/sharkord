import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Input
} from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TServerPasswordDialogProps = TDialogBaseProps & {
  onConfirm: (password: string) => void;
  onCancel: () => void;
};

const ServerPasswordDialog = memo(
  ({ isOpen, close, onConfirm, onCancel }: TServerPasswordDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [password, setPassword] = useState('');

    const handleConfirm = useCallback(() => {
      onConfirm(password);
    }, [password, onConfirm]);

    const handleCancel = useCallback(() => {
      onCancel();
      close();
    }, [onCancel, close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('serverPasswordTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('serverPasswordDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AutoFocus>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onEnter={handleConfirm}
              autoFocus
            />
          </AutoFocus>

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={handleConfirm}>
                {t('joinBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ServerPasswordDialog };
