import { SettingsListEditor } from '@/components/server-screens/settings-shell/list-editor';
import {
  useAdminChannelGeneral,
  useAdminChannelPermissions
} from '@/features/server/admin/hooks';
import { ChannelPermission } from '@sharkord/shared';
import { Alert, AlertDescription, AlertTitle, LoadingCard } from '@sharkord/ui';
import { MessageCircleWarning, Users } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Override } from './override';
import { OverridesList } from './overrides-list';
import type { TChannelPermission } from './types';

type TChannelPermissionsProps = {
  channelId: number;
};

const ChannelPermissions = memo(({ channelId }: TChannelPermissionsProps) => {
  const { t } = useTranslation('settings');
  const [selectedOverrideId, setSelectedOverrideId] = useState<
    string | undefined
  >();
  const { channel } = useAdminChannelGeneral(channelId);
  const { rolePermissions, userPermissions, loading, refetch } =
    useAdminChannelPermissions(channelId);

  const selectedPermissions = useMemo<TChannelPermission[]>(() => {
    if (!selectedOverrideId) return [];

    const [type, idStr] = selectedOverrideId.split('-');
    const id = parseInt(idStr);
    const matches =
      type === 'role'
        ? rolePermissions.filter((perm) => perm.roleId === id)
        : userPermissions.filter((perm) => perm.userId === id);

    return matches.map((perm) => ({
      permission: perm.permission as ChannelPermission,
      allow: perm.allow
    }));
  }, [selectedOverrideId, rolePermissions, userPermissions]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <>
      {!channel?.private && (
        <Alert variant="destructive">
          <MessageCircleWarning />
          <AlertTitle>{t('publicChannelTitle')}</AlertTitle>
          <AlertDescription>{t('publicChannelDesc')}</AlertDescription>
        </Alert>
      )}

      <SettingsListEditor
        emptyIcon={Users}
        emptyTitle={t('selectRoleOrUser')}
        list={
          <OverridesList
            channelId={channelId}
            rolePermissions={rolePermissions}
            userPermissions={userPermissions}
            selectedOverrideId={selectedOverrideId}
            setSelectedOverrideId={setSelectedOverrideId}
            refetch={refetch}
          />
        }
        editor={
          selectedOverrideId && (
            <Override
              key={selectedOverrideId}
              channelId={channelId}
              overrideId={selectedOverrideId}
              permissions={selectedPermissions}
              setSelectedOverrideId={setSelectedOverrideId}
              refetch={refetch}
            />
          )
        }
      />
    </>
  );
});

export { ChannelPermissions };
