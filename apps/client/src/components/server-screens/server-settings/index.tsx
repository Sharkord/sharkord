import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCan } from '@/features/server/hooks';
import { Permission } from '@sharkord/shared';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { ServerScreenLayout } from '../server-screen-layout';
import { Emojis } from './emojis';
import { General } from './general';
import { Invites } from './invites';
import { Plugins } from './plugins';
import { Roles } from './roles';
import { Storage } from './storage';
import { Updates } from './updates';
import { Users } from './users';

type TServerSettingsProps = TServerScreenBaseProps;

const ServerSettings = memo(({ close }: TServerSettingsProps) => {
  const can = useCan();
  const { t } = useTranslation();

  const defaultTab = useMemo(() => {
    if (can(Permission.MANAGE_SETTINGS)) return 'general';
    if (can(Permission.MANAGE_ROLES)) return 'roles';
    if (can(Permission.MANAGE_EMOJIS)) return 'emojis';
    if (can(Permission.MANAGE_STORAGE)) return 'storage';
    if (can(Permission.MANAGE_USERS)) return 'users';
    if (can(Permission.MANAGE_INVITES)) return 'invites';
    if (can(Permission.MANAGE_UPDATES)) return 'updates';
    return 'general';
  }, [can]);

  return (
    <ServerScreenLayout close={close} title={t('serverSettings.title')}>
      <div className="mx-auto max-w-4xl">
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger
              value="general"
              disabled={!can(Permission.MANAGE_SETTINGS)}
            >
              {t('serverSettings.tabs.general')}
            </TabsTrigger>
            <TabsTrigger value="roles" disabled={!can(Permission.MANAGE_ROLES)}>
              {t('serverSettings.tabs.roles')}
            </TabsTrigger>
            <TabsTrigger
              value="emojis"
              disabled={!can(Permission.MANAGE_EMOJIS)}
            >
              {t('serverSettings.tabs.emojis')}
            </TabsTrigger>
            <TabsTrigger
              value="storage"
              disabled={!can(Permission.MANAGE_STORAGE)}
            >
              {t('serverSettings.tabs.storage')}
            </TabsTrigger>
            <TabsTrigger value="users" disabled={!can(Permission.MANAGE_USERS)}>
              {t('serverSettings.tabs.users')}
            </TabsTrigger>
            <TabsTrigger
              value="invites"
              disabled={!can(Permission.MANAGE_INVITES)}
            >
              {t('serverSettings.tabs.invites')}
            </TabsTrigger>
            <TabsTrigger
              value="updates"
              disabled={!can(Permission.MANAGE_UPDATES)}
            >
              {t('serverSettings.tabs.updates')}
            </TabsTrigger>
            <TabsTrigger
              value="plugins"
              disabled={!can(Permission.MANAGE_PLUGINS)}
            >
              {t('serverSettings.tabs.plugins')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general" className="space-y-6">
            {can(Permission.MANAGE_SETTINGS) && <General />}
          </TabsContent>
          <TabsContent value="roles" className="space-y-6">
            {can(Permission.MANAGE_ROLES) && <Roles />}
          </TabsContent>
          <TabsContent value="emojis" className="space-y-6">
            {can(Permission.MANAGE_EMOJIS) && <Emojis />}
          </TabsContent>
          <TabsContent value="storage" className="space-y-6">
            {can(Permission.MANAGE_STORAGE) && <Storage />}
          </TabsContent>
          <TabsContent value="users" className="space-y-6">
            {can(Permission.MANAGE_USERS) && <Users />}
          </TabsContent>
          <TabsContent value="invites" className="space-y-6">
            {can(Permission.MANAGE_INVITES) && <Invites />}
          </TabsContent>
          <TabsContent value="updates" className="space-y-6">
            {can(Permission.MANAGE_UPDATES) && <Updates />}
          </TabsContent>
          <TabsContent value="plugins" className="space-y-6">
            {can(Permission.MANAGE_PLUGINS) && <Plugins />}
          </TabsContent>
        </Tabs>
      </div>
    </ServerScreenLayout>
  );
});

export { ServerSettings };
