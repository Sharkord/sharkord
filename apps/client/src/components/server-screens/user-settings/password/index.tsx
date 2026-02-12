import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const Password = memo(() => {
  const { t } = useTranslation();
  const { setTrpcErrors, r, values } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const updatePassword = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.updatePassword.mutate(values);
      toast.success(t('userSettings.password.toasts.updated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userSettings.password.title')}</CardTitle>
        <CardDescription>
          {t('userSettings.password.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('userSettings.password.currentPasswordLabel')}>
          <Input {...r('currentPassword', 'password')} />
        </Group>

        <Group label={t('userSettings.password.newPasswordLabel')}>
          <Input {...r('newPassword', 'password')} />
        </Group>

        <Group label={t('userSettings.password.confirmNewPasswordLabel')}>
          <Input {...r('confirmNewPassword', 'password')} />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('userSettings.actions.cancel')}
          </Button>
          <Button onClick={updatePassword}>
            {t('userSettings.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Password };
