import { Dialog } from '@/components/dialogs/dialogs';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminInvites } from '@/features/server/admin/hooks';
import { Button, LoadingCard } from '@sharkord/ui';
import { Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitesTable } from './invites-table';

const Invites = memo(() => {
  const { t } = useTranslation('settings');
  const { invites, loading, refetch } = useAdminInvites();

  const onCreateInvite = useCallback(
    () => openDialog(Dialog.CREATE_INVITE, { refetch }),
    [refetch]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection
      title={t('invitesTitle')}
      description={t('invitesDesc')}
      action={
        <Button onClick={onCreateInvite}>
          <Plus className="h-4 w-4" />
          {t('createInviteBtn')}
        </Button>
      }
    >
      <InvitesTable invites={invites} refetch={refetch} />
    </SettingsSection>
  );
});

export { Invites };
