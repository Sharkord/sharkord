import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedUser } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TableUser } from './table-user';

type TUsersTableProps = {
  users: TJoinedUser[];
  refetch?: () => void;
};

const UsersTable = memo(({ users, refetch }: TUsersTableProps) => {
  const { t } = useTranslation('settings');
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
          <div>{t('usersAvatarCol')}</div>
          <div>{t('usersUserCol')}</div>
          <div>{t('usersRolesCol')}</div>
          <div>{t('usersJoinedAtCol')}</div>
          <div>{t('usersLastJoinCol')}</div>
          <div>{t('usersStatusCol')}</div>
          <div>{t('usersActionsCol')}</div>
        </>
      }
      gridCols="grid-cols-[60px_1fr_120px_120px_120px_80px_50px]"
      itemsPerPage={8}
      searchPlaceholder={t('searchUsersPlaceholder')}
      emptyMessage={t('noUsersFound')}
    />
  );
});

export { UsersTable };
