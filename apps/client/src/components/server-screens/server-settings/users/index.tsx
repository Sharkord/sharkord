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
import { UsersTable } from './users-table';

const Users = memo(() => {
  const { users, loading, refetch } = useAdminUsers();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          Manage server users and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <UsersTable users={users} refetch={refetch} />
      </CardContent>
    </Card>
  );
});

export { Users };
