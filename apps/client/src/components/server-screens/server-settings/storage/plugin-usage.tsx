import type { TPluginStorageUsage } from '@sharkord/shared';
import { Badge } from '@sharkord/ui';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TPluginStorageUsageProps = {
  pluginStorage: TPluginStorageUsage[];
};

const PluginStorageUsage = memo(
  ({ pluginStorage }: TPluginStorageUsageProps) => {
    const { t } = useTranslation('settings');

    if (pluginStorage.length === 0) return null;

    return (
      <div className="rounded-lg border p-4">
        <div className="mb-1 text-sm font-medium">
          {t('pluginStorageTitle')}
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          {t('pluginStorageDesc')}
        </div>
        <div className="space-y-2">
          {pluginStorage.map((usage) => (
            <div
              key={usage.pluginId}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-mono text-sm">
                  {usage.pluginId}
                </span>
                {!usage.installed && (
                  <Badge variant="destructive">
                    {t('pluginStorageUninstalled')}
                  </Badge>
                )}
              </div>
              <div className="shrink-0 text-sm text-muted-foreground">
                {t('pluginStorageFiles', { count: usage.fileCount })}
                {' · '}
                {filesize(usage.usedSpace, { standard: 'jedec' })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
);

PluginStorageUsage.displayName = 'PluginStorageUsage';

export { PluginStorageUsage };
