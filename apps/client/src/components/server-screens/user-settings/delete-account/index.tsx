import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useOwnUserPasswordSet } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { Button, Group, Input, Switch } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const DeleteAccount = memo(() => {
  const { t } = useTranslation('settings');
  const hasPassword = useOwnUserPasswordSet();
  const [password, setPassword] = useState('');
  const [wipe, setWipe] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onPasswordChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(event.target.value);
    },
    []
  );

  const onDelete = useCallback(async () => {
    const confirmed = await requestConfirmation({
      title: t('deleteAccountTitle'),
      message: wipe ? t('deleteAccountWipeMsg') : t('deleteAccountKeepMsg'),
      confirmLabel: t('deleteAccountBtn'),
      variant: 'danger'
    });

    if (!confirmed) return;

    setIsDeleting(true);

    try {
      const trpc = getTRPCClient();

      // the server closes this connection just after replying, which signs out here
      await trpc.users.deleteOwn.mutate({
        password: hasPassword ? password : undefined,
        wipe
      });
    } catch (error) {
      toast.error(getTrpcError(error, t('failedDeleteAccount')));
    } finally {
      setIsDeleting(false);
    }
  }, [t, wipe, hasPassword, password]);

  return (
    <SettingsSection
      title={t('deleteAccountTitle')}
      description={t('deleteAccountDesc')}
    >
      {hasPassword && (
        <Group label={t('currentPasswordLabel')}>
          <Input
            type="password"
            value={password}
            onChange={onPasswordChange}
            autoComplete="current-password"
          />
        </Group>
      )}

      <Group
        label={t('deleteAccountWipeLabel')}
        description={t('deleteAccountWipeDesc')}
      >
        <Switch checked={wipe} onCheckedChange={setWipe} />
      </Group>

      <Button
        variant="destructive"
        onClick={onDelete}
        disabled={isDeleting || (hasPassword && !password)}
      >
        {t('deleteAccountBtn')}
      </Button>
    </SettingsSection>
  );
});

export { DeleteAccount };
