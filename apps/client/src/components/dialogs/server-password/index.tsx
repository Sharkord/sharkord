import { openDialog } from '@/features/dialogs/actions';
import { joinServer } from '@/features/server/actions';
import { useForm } from '@/hooks/use-form';
import { cleanup } from '@/lib/trpc';
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
import { Dialog } from '../dialogs';
import type { TDialogBaseProps } from '../types';

type TServerPasswordDialogProps = TDialogBaseProps & {
  handshakeHash: string;
};

const ServerPasswordDialog = memo(
  ({ isOpen, close, handshakeHash }: TServerPasswordDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { r, values, setTrpcErrors, errors } = useForm({
      password: ''
    });
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      try {
        setLoading(true);
        const { showWelcomeDialog } = await joinServer(
          handshakeHash,
          values.password
        );

        close();

        if (showWelcomeDialog) {
          setTimeout(() => {
            openDialog(Dialog.WELCOME_PROFILE_SETUP);
          }, 175);
        }
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [handshakeHash, values.password, close, setTrpcErrors]);

    const onCancel = useCallback(() => {
      cleanup();
      close();
    }, [close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('serverPasswordTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('serverPasswordDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <AutoFocus>
              <Input
                {...r('password')}
                className="mt-2"
                type="password"
                error={errors._general}
              />
            </AutoFocus>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!values.password || loading}
              >
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
