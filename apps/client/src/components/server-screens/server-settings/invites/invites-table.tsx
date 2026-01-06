import { PaginatedTable } from '@/components/paginated-table';
import type { TJoinedInvite } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { TableInvite } from './table-invite';

type TInvitesTableProps = {
  invites: TJoinedInvite[];
  refetch: () => void;
};

const InvitesTable = memo(({ invites, refetch }: TInvitesTableProps) => {
  const searchFilter = useCallback(
    (invite: TJoinedInvite, searchTerm: string) => {
      const query = searchTerm.toLowerCase();

      return (
        invite.code.toLowerCase().includes(query) ||
        invite.creator.name.toLowerCase().includes(query)
      );
    },
    []
  );

  return (
    <PaginatedTable
      items={invites}
      renderRow={(invite) => (
        <TableInvite key={invite.id} invite={invite} refetch={refetch} />
      )}
      searchFilter={searchFilter}
      headerColumns={
        <>
          <div>Code</div>
          <div>Creator</div>
          <div>Uses</div>
          <div>Expires</div>
          <div>Created</div>
          <div>Status</div>
          <div>Actions</div>
        </>
      }
      gridCols="grid-cols-[180px_60px_80px_100px_140px_80px_80px]"
      itemsPerPage={8}
      searchPlaceholder="Search invites by code or creator..."
      emptyMessage="No invites found"
    />
  );
});

export { InvitesTable };
