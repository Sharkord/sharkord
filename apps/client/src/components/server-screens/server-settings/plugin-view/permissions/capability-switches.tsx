import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import {
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginCapability
} from '@sharkord/shared';
import { Button, Label, Switch } from '@sharkord/ui';
import { RotateCcw } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  capabilityKey,
  EVERYONE_KEY,
  type TCapabilityAccessEntry,
  type TCapabilityAccessMap
} from './types';

const SECTIONS = [
  { type: PluginCapabilityType.COMMAND, key: 'pluginCapabilityCommands' },
  { type: PluginCapabilityType.ACTION, key: 'pluginCapabilityActions' },
  { type: PluginCapabilityType.HTTP_ROUTE, key: 'pluginCapabilityHttpRoutes' },
  { type: PluginCapabilityType.COMPONENT, key: 'pluginCapabilityComponents' }
];

type TCapabilityRowProps = {
  capability: TPluginCapability;
  entry: TCapabilityAccessEntry;
  isEveryone: boolean;
  roleId: number;
  onToggle: (key: string, enabled: boolean) => void;
  onReset: (key: string) => void;
};

const CapabilityRow = memo(
  ({
    capability,
    entry,
    isEveryone,
    roleId,
    onToggle,
    onReset
  }: TCapabilityRowProps) => {
    const { t } = useTranslation(['settings', 'permissions']);
    const key = capabilityKey(capability.type, capability.name);
    const isPublic = entry.mode === PluginCapabilityMode.PUBLIC;

    const handleChange = useCallback(
      (enabled: boolean) => onToggle(key, enabled),
      [key, onToggle]
    );

    const handleReset = useCallback(() => onReset(key), [key, onReset]);

    const isLocked = !isEveryone && isPublic;

    const getHint = () => {
      if (isLocked) return t('settings:pluginAccessPublicLocked');

      if (capability.requires) {
        return t('settings:pluginAccessRequires', {
          permission: t(`permissions:server.${capability.requires}`)
        });
      }

      return capability.description;
    };

    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <Label className="font-mono">{capability.name}</Label>
          <span className="text-sm text-muted-foreground">{getHint()}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {isEveryone && entry.configured && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('settings:pluginAccessResetToDefault')}
              title={t('settings:pluginAccessResetToDefault')}
              onClick={handleReset}
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Switch
            checked={isEveryone ? isPublic : entry.roleIds.includes(roleId)}
            disabled={isLocked}
            onCheckedChange={handleChange}
          />
        </div>
      </div>
    );
  }
);

CapabilityRow.displayName = 'CapabilityRow';

type TCapabilitySwitchesProps = {
  capabilities: TPluginCapability[];
  access: TCapabilityAccessMap;
  selectedKey: string;
  onToggle: (key: string, enabled: boolean) => void;
  onReset: (key: string) => void;
};

const CapabilitySwitches = memo(
  ({
    capabilities,
    access,
    selectedKey,
    onToggle,
    onReset
  }: TCapabilitySwitchesProps) => {
    const { t } = useTranslation('settings');

    const isEveryone = selectedKey === EVERYONE_KEY;
    const roleId = Number(selectedKey);

    return (
      <div className="flex-1 space-y-6">
        {SECTIONS.map(({ type, key }) => {
          const forType = capabilities.filter(
            (capability) => capability.type === type
          );

          if (forType.length === 0) return null;

          return (
            <SettingsSection
              key={type}
              title={t(key)}
              description={
                isEveryone
                  ? t('pluginAccessEveryoneHelp')
                  : t('pluginAccessRoleHelp')
              }
            >
              {forType.map((capability) => {
                const entry = access[capabilityKey(type, capability.name)];

                if (!entry) return null;

                return (
                  <CapabilityRow
                    key={capability.name}
                    capability={capability}
                    entry={entry}
                    isEveryone={isEveryone}
                    roleId={roleId}
                    onToggle={onToggle}
                    onReset={onReset}
                  />
                );
              })}
            </SettingsSection>
          );
        })}
      </div>
    );
  }
);

CapabilitySwitches.displayName = 'CapabilitySwitches';

export { CapabilitySwitches };
