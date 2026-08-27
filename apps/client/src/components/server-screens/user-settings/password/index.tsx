import { closeServerScreens } from '@/features/server-screens/actions';
import { useOwnUserPasswordSet } from '@/features/server/users/hooks';
import { useForm } from '@/hooks/use-form';
import { cleanup, getTRPCClient } from '@/lib/trpc';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Password = memo(() => {
  const { t } = useTranslation('settings');
  const { setTrpcErrors, r, values } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const canChangePassword = useOwnUserPasswordSet();

  const updatePassword = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.updatePassword.mutate(values);
      toast.success(t('passwordUpdated'));
      cleanup();
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('passwordTitle')}</CardTitle>
        <CardDescription>{t('passwordDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canChangePassword && (
          <Alert variant="info">
            <AlertTitle>{t('passwordManagedBySsoTitle')}</AlertTitle>
            <AlertDescription>{t('passwordManagedBySsoDesc')}</AlertDescription>
          </Alert>
        )}

        <Group label={t('currentPasswordLabel')}>
          <Input
            {...r('currentPassword', 'password')}
            disabled={!canChangePassword}
          />
        </Group>

        <Group label={t('newPasswordLabel')}>
          <Input
            {...r('newPassword', 'password')}
            disabled={!canChangePassword}
          />
        </Group>

        <Group label={t('confirmNewPasswordLabel')}>
          <Input
            {...r('confirmNewPassword', 'password')}
            disabled={!canChangePassword}
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={updatePassword} disabled={!canChangePassword}>
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Password };
