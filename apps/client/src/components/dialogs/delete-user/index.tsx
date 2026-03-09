import { requestConfirmation } from '@/features/dialogs/actions';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedUser } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Group,
  Switch
} from '@sharkord/ui';
import { AlertCircleIcon } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TDeleteUserDialogProps = TDialogBaseProps & {
  user: TJoinedUser;
  refetch: () => Promise<void>;
  onDelete?: () => void;
};

const DeleteUserDialog = memo(
  ({ isOpen, close, user, refetch, onDelete }: TDeleteUserDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [wipe, setWipe] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const onSubmit = useCallback(async () => {
      const choice = await requestConfirmation({
        title: t('confirmDeleteTitle', { name: user.name }),
        message: wipe ? t('confirmDeleteMsgWithWipe') : t('confirmDeleteMsg'),
        confirmLabel: t('deleteUserBtn'),
        cancelLabel: t('cancel')
      });

      if (!choice) {
        return;
      }

      const trpc = getTRPCClient();

      try {
        setIsDeleting(true);

        await trpc.users.delete.mutate({
          userId: user.id,
          wipe
        });

        toast.success(t('userDeletedSuccess'));

        close();
        refetch();
        onDelete?.();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedDeleteUser')));
      } finally {
        setIsDeleting(false);
      }
    }, [close, refetch, wipe, user.name, user.id, onDelete, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('deleteUserTitle', { name: user.name })}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-4">
            <Group label={t('wipeAllDataLabel')}>
              <Switch
                checked={wipe}
                onCheckedChange={(checked) => setWipe(checked)}
              />
            </Group>

            {wipe ? (
              <Alert variant="destructive" className="py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('wipeDestructiveWarning')}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="info" className="py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t('wipeInfoWarning')}
                </AlertDescription>
              </Alert>
            )}
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={close}>{t('cancel')}</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={onSubmit} disabled={isDeleting}>
                {t('deleteUserBtn')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { DeleteUserDialog };
