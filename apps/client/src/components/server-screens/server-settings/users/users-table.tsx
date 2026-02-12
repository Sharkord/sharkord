import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedUser } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { TableUser } from './table-user';

type TUsersTableProps = {
  users: TJoinedUser[];
};

const UsersTable = memo(({ users }: TUsersTableProps) => {
  const { t } = useTranslation();
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
      renderRow={(user) => <TableUser user={user} />}
      searchFilter={searchFilter}
      headerColumns={
        <>
          <div>{t('serverSettings.users.columns.avatar')}</div>
          <div>{t('serverSettings.users.columns.user')}</div>
          <div>{t('serverSettings.users.columns.roles')}</div>
          <div>{t('serverSettings.users.columns.joinedAt')}</div>
          <div>{t('serverSettings.users.columns.lastJoin')}</div>
          <div>{t('serverSettings.users.columns.status')}</div>
          <div>{t('serverSettings.users.columns.actions')}</div>
        </>
      }
      gridCols="grid-cols-[60px_1fr_120px_120px_120px_80px_50px]"
      itemsPerPage={8}
      searchPlaceholder={t('placeholders.searchUsers')}
      emptyMessage={t('serverSettings.users.emptyMessage')}
    />
  );
});

export { UsersTable };
