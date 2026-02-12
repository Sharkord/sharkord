import { Dialog } from '@/components/dialogs/dialogs';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { LoadingCard } from '@/components/ui/loading-card';
import { openDialog } from '@/features/dialogs/actions';
import { useAdminInvites } from '@/features/server/admin/hooks';
import { Plus } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { InvitesTable } from './invites-table';

const Invites = memo(() => {
  const { t } = useTranslation();
  const { invites, loading, refetch } = useAdminInvites();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t('serverSettings.invites.title')}</CardTitle>
          <CardDescription>
            {t('serverSettings.invites.description')}
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
          {t('serverSettings.invites.createInvite')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <InvitesTable invites={invites} refetch={refetch} />
      </CardContent>
    </Card>
  );
});

export { Invites };
