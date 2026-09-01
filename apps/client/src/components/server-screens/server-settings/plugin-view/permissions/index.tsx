import { hasUnsavedChanges } from '@/components/server-screens/settings-shell/helpers';
import { SettingsListEditor } from '@/components/server-screens/settings-shell/list-editor';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { usePluginSlotIds } from '@/features/server/plugins/hooks';
import { useRoles } from '@/features/server/roles/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  OWNER_ROLE_ID,
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginCapability
} from '@sharkord/shared';
import { LoadingCard } from '@sharkord/ui';
import { Users } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { CapabilitySwitches } from './capability-switches';
import { RoleList } from './role-list';
import {
  capabilityKey,
  EVERYONE_KEY,
  toEntry,
  type TCapabilityAccessMap
} from './types';

type TPluginPermissionsProps = {
  pluginId: string;
};

const PluginPermissions = memo(({ pluginId }: TPluginPermissionsProps) => {
  const { t } = useTranslation('settings');
  const declaredSlots = usePluginSlotIds(pluginId);
  const roles = useRoles();

  const [capabilities, setCapabilities] = useState<TPluginCapability[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string>(EVERYONE_KEY);

  const savedRef = useRef<TCapabilityAccessMap>({});

  const onSave = useCallback(
    async (values: TCapabilityAccessMap) => {
      const trpc = getTRPCClient();

      for (const capability of capabilities) {
        const key = capabilityKey(capability.type, capability.name);
        const entry = values[key];
        const saved = savedRef.current[key];

        if (!entry || !hasUnsavedChanges(entry, saved)) continue;

        if (entry.configured) {
          await trpc.plugins.setCapabilityAccess.mutate({
            pluginId,
            type: capability.type,
            name: capability.name,
            mode: entry.mode,
            roleIds: entry.roleIds
          });
        } else {
          await trpc.plugins.resetCapabilityAccess.mutate({
            pluginId,
            type: capability.type,
            name: capability.name
          });
        }
      }

      savedRef.current = values;
    },
    [capabilities, pluginId]
  );

  const { values, setValues, reset } = useSettingsForm<TCapabilityAccessMap>({
    initialValues: {},
    onSave,
    successMessage: t('pluginPermissionsSaved'),
    errorMessage: t('failedSavePluginCapability')
  });

  useEffect(() => {
    const fetchCapabilities = async () => {
      setLoading(true);

      try {
        const trpc = getTRPCClient();
        const result = await trpc.plugins.getCapabilities.query({ pluginId });

        const known = new Set(
          result.capabilities
            .filter(
              (capability) => capability.type === PluginCapabilityType.COMPONENT
            )
            .map((capability) => capability.name)
        );

        const defaultAccess = {
          mode: PluginCapabilityMode.PUBLIC,
          roleIds: []
        };

        const slots: TPluginCapability[] = declaredSlots
          .filter((slotId) => !known.has(slotId))
          .map((slotId) => ({
            type: PluginCapabilityType.COMPONENT,
            name: slotId,
            configured: false,
            defaultAccess,
            ...defaultAccess
          }));

        const all = [...result.capabilities, ...slots];
        const loaded = Object.fromEntries(
          all.map((capability) => [
            capabilityKey(capability.type, capability.name),
            toEntry(capability, capability.configured)
          ])
        );

        setCapabilities(all);
        savedRef.current = loaded;
        reset(loaded);
      } catch (error) {
        toast.error(getTrpcError(error, t('failedLoadPluginCapabilities')));
      } finally {
        setLoading(false);
      }
    };

    fetchCapabilities();
  }, [declaredSlots, pluginId, reset, t]);

  const handleToggle = useCallback(
    (key: string, enabled: boolean) => {
      setValues((previous) => {
        const entry = previous[key];

        if (!entry) return previous;

        if (selectedKey === EVERYONE_KEY) {
          return {
            ...previous,
            [key]: {
              ...entry,
              configured: true,
              mode: enabled
                ? PluginCapabilityMode.PUBLIC
                : PluginCapabilityMode.RESTRICTED
            }
          };
        }

        const roleId = Number(selectedKey);

        return {
          ...previous,
          [key]: {
            ...entry,
            configured: true,
            roleIds: (enabled
              ? [...entry.roleIds, roleId]
              : entry.roleIds.filter((id) => id !== roleId)
            ).sort((a, b) => a - b)
          }
        };
      });
    },
    [selectedKey, setValues]
  );

  const handleReset = useCallback(
    (key: string) => {
      const capability = capabilities.find(
        (item) => capabilityKey(item.type, item.name) === key
      );

      if (!capability) return;

      setValues((previous) => ({
        ...previous,
        [key]: toEntry(capability.defaultAccess, false)
      }));
    },
    [capabilities, setValues]
  );

  const selectableRoles = useMemo(
    () => roles.filter((role) => role.id !== OWNER_ROLE_ID),
    [roles]
  );

  if (loading) return <LoadingCard className="h-[600px]" />;

  if (capabilities.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {t('pluginNoCapabilities')}
      </div>
    );
  }

  return (
    <SettingsListEditor
      emptyIcon={Users}
      emptyTitle={t('pluginAccessSelectAudience')}
      list={
        <RoleList
          roles={selectableRoles}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
      }
      editor={
        <CapabilitySwitches
          capabilities={capabilities}
          access={values}
          selectedKey={selectedKey}
          onToggle={handleToggle}
          onReset={handleReset}
        />
      }
    />
  );
});

PluginPermissions.displayName = 'PluginPermissions';

export { PluginPermissions };
