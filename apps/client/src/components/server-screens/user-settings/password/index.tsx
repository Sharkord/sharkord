import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useOwnUserPasswordSet } from '@/features/server/users/hooks';
import { cleanup, getTRPCClient } from '@/lib/trpc';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Group,
  Input
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TPasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const Password = memo(() => {
  const { t } = useTranslation('settings');
  const canChangePassword = useOwnUserPasswordSet();

  const onSave = useCallback(async (values: TPasswordValues) => {
    const trpc = getTRPCClient();

    await trpc.users.updatePassword.mutate(values);
    cleanup();
  }, []);

  const { r } = useSettingsForm<TPasswordValues>({
    initialValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: ''
    },
    onSave,
    successMessage: t('passwordUpdated'),
    errorMessage: t('failedUpdatePassword')
  });

  return (
    <SettingsSection title={t('passwordTitle')} description={t('passwordDesc')}>
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
    </SettingsSection>
  );
});

export { Password };
