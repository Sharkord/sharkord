import { useAdminUsers } from '@/features/server/admin/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingCard
} from '@sharkord/ui';
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
    <Card>
      <CardHeader>
        <CardTitle>{t('usersTitle')}</CardTitle>
        <CardDescription>{t('usersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsersTable users={users} refetch={refetch} />
      </CardContent>
    </Card>
  );
});

export { Users };
