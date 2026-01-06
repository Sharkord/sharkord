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
import { UsersTable } from './users-table';

const Users = memo(() => {
  const { users, loading } = useAdminUsers();

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
        <UsersTable users={users} />
      </CardContent>
    </Card>
  );
});

export { Users };
