import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedUser } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { TableUser } from './table-user';

type TUsersTableProps = {
  users: TJoinedUser[];
  refetch?: () => void;
};

const UsersTable = memo(({ users, refetch }: TUsersTableProps) => {
  const searchFilter = useCallback((user: TJoinedUser, searchTerm: string) => {
    const query = searchTerm.toLowerCase();

    return (
      user.name.toLowerCase().includes(query) ||
      user.identity?.toLowerCase().includes(query)
    );
  }, []);

  return (
    <PaginatedTable
      items={users}
      renderRow={(user) => <TableUser user={user} refetch={refetch} />}
      searchFilter={searchFilter}
      headerColumns={
        <>
          <div>Avatar</div>
          <div>User</div>
          <div>Roles</div>
          <div>Joined At</div>
          <div>Last Join</div>
          <div>Status</div>
          <div>Actions</div>
        </>
      }
      gridCols="grid-cols-[60px_1fr_120px_120px_120px_80px_50px]"
      itemsPerPage={8}
      searchPlaceholder="Search users by name or identity..."
      emptyMessage="No users found"
    />
  );
});

export { UsersTable };
