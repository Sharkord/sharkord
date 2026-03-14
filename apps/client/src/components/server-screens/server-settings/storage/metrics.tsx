import type { TDiskMetrics } from '@sharkord/shared';
import { filesize } from 'filesize';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface DiskMetricsProps {
  diskMetrics: TDiskMetrics;
}

const DiskMetrics = memo(({ diskMetrics }: DiskMetricsProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {t('diskTotalSpace')}
        </div>
        <div className="text-lg font-semibold">
          {filesize(diskMetrics.totalSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {t('diskAvailableSpace')}
        </div>
        <div className="text-lg font-semibold">
          {filesize(diskMetrics.freeSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {t('diskSystemUsed')}
        </div>
        <div className="text-lg font-semibold">
          {filesize(diskMetrics.usedSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div>
        <div className="text-sm font-medium text-muted-foreground">
          {t('diskSharkordUsed')}
        </div>
        <div className="text-lg font-semibold">
          {filesize(diskMetrics.sharkordUsedSpace, { standard: 'jedec' })}
        </div>
      </div>
      <div className="col-span-2 mt-2">
        <div className="text-sm font-medium text-muted-foreground mb-2">
          {t('diskUsage')}
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(
                (diskMetrics.usedSpace / diskMetrics.totalSpace) * 100,
                100
              )}%`
            }}
          />
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {t('diskUsedPercent', {
            percent: (
              (diskMetrics.usedSpace / diskMetrics.totalSpace) *
              100
            ).toFixed(1)
          })}
        </div>
      </div>
    </div>
  );
});

DiskMetrics.displayName = 'DiskMetrics';

export { DiskMetrics };
