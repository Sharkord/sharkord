import { PaginatedTable } from '@/components/paginated-table';
import type { TAdminUser } from '@/features/server/admin/hooks';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TableUser } from './table-user';

type TUsersTableProps = {
  users: TAdminUser[];
  refetch?: () => void;
};

const UsersTable = memo(({ users, refetch }: TUsersTableProps) => {
  const { t } = useTranslation('settings');

  const searchFilter = useCallback((user: TAdminUser, searchTerm: string) => {
    return user.name.toLowerCase().includes(searchTerm.toLowerCase());
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
