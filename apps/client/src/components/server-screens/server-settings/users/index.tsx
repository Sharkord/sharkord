import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/loading-card';
import { useAdminUsers } from '@/features/server/admin/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { UsersTable } from './users-table';

const Users = memo(() => {
  const { t } = useTranslation();
  const { users, loading } = useAdminUsers();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('serverSettings.users.title')}</CardTitle>
        <CardDescription>
          {t('serverSettings.users.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsersTable users={users} />
      </CardContent>
    </Card>
  );
});

export { Users };
