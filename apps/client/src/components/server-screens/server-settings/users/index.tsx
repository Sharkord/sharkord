import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useAdminUsers } from '@/features/server/admin/hooks';
import { LoadingCard } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersTable } from './users-table';

const Users = memo(() => {
  const { t } = useTranslation('settings');
  const { users, loading, refetch } = useAdminUsers();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection title={t('usersTitle')} description={t('usersDesc')}>
      <UsersTable users={users} refetch={refetch} />
    </SettingsSection>
  );
});

export { Users };
