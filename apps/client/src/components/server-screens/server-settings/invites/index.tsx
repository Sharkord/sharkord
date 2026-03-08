import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminInvites } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingCard
} from '@sharkord/ui';
import { Plus } from 'lucide-react';
import { memo } from 'react';
import { InvitesTable } from './invites-table';

const Invites = memo(() => {
  const { invites, loading, refetch } = useAdminInvites();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Server Invites</CardTitle>
          <CardDescription>
            Manage invitation links for users to join the server
          </CardDescription>
        </div>
        <Button
          onClick={() =>
            openDialog(Dialog.CREATE_INVITE, {
              refetch
            })
          }
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Invite
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <InvitesTable invites={invites} refetch={refetch} />
      </CardContent>
    </Card>
  );
});

export { Invites };
