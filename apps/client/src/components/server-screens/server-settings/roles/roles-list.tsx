import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { i18n } from '@/i18n';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedRole } from '@sharkord/shared';
import { Plus } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TRolesListProps = {
  roles: TJoinedRole[];
  selectedRoleId: number | undefined;
  setSelectedRoleId: (roleId: number) => void;
  refetch: () => void;
};

const RolesList = memo(
  ({ roles, selectedRoleId, setSelectedRoleId, refetch }: TRolesListProps) => {
    const { t } = useTranslation();

    const onAddRole = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const newRoleId = await trpc.roles.add.mutate();

        await refetch();

        setSelectedRoleId(newRoleId);
        toast.success(i18n.t('toasts.roles.created'));
      } catch {
        toast.error(i18n.t('toasts.roles.createFailed'));
      }
    }, [refetch, setSelectedRoleId]);

    return (
      <Card className="w-64 flex-shrink-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t('serverSettings.roles.title')}
            </CardTitle>
            <Button size="icon" variant="ghost" onClick={onAddRole}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 p-2">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setSelectedRoleId(role.id)}
              className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent ${
                selectedRoleId === role.id ? 'bg-accent' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: role.color }}
                />
                <span>{role.name}</span>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>
    );
  }
);

export { RolesList };
