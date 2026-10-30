import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { cn } from '@/lib/utils';
import type { TJoinedRole } from '@sharkord/shared';
import { Globe } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { EVERYONE_KEY } from './types';

type TEntryProps = {
  entryKey: string;
  label: string;
  description?: string;
  color?: string;
  isSelected: boolean;
  onSelect: (key: string) => void;
};

const Entry = memo(
  ({
    entryKey,
    label,
    description,
    color,
    isSelected,
    onSelect
  }: TEntryProps) => {
    const handleClick = useCallback(
      () => onSelect(entryKey),
      [entryKey, onSelect]
    );

    return (
      <button
        type="button"
        onClick={handleClick}
        aria-current={isSelected ? 'true' : undefined}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
          isSelected
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
        )}
      >
        {color ? (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : (
          <Globe className="h-4 w-4 shrink-0" />
        )}
        <span className="min-w-0">
          <span className="block truncate">{label}</span>
          {description && (
            <span className="block truncate text-xs text-muted-foreground">
              {description}
            </span>
          )}
        </span>
      </button>
    );
  }
);

Entry.displayName = 'Entry';

type TRoleListProps = {
  roles: TJoinedRole[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

const RoleList = memo(({ roles, selectedKey, onSelect }: TRoleListProps) => {
  const { t } = useTranslation('settings');

  return (
    <SettingsSection title={t('pluginAccessAudienceTitle')}>
      <div className="space-y-0.5">
        <Entry
          entryKey={EVERYONE_KEY}
          label={t('pluginAccessEveryone')}
          description={t('pluginAccessEveryoneDesc')}
          isSelected={selectedKey === EVERYONE_KEY}
          onSelect={onSelect}
        />

        {roles.map((role) => (
          <Entry
            key={role.id}
            entryKey={String(role.id)}
            label={role.name}
            color={role.color}
            isSelected={selectedKey === String(role.id)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </SettingsSection>
  );
});

RoleList.displayName = 'RoleList';

export { RoleList };
