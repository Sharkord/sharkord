import { Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import { filesize } from 'filesize';
import { Database } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

type TRowProps = {
  label: string;
  value: string | number;
};

const Row = memo(({ label, value }: TRowProps) => (
  <div className="flex items-center justify-between gap-4 py-1.5 px-1">
    <span className="text-sm">{label}</span>
    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
      {value}
    </span>
  </div>
));

const Storage = memo(() => {
  const { t } = useTranslation('settings');
  const { storage } = useModViewContext();
  const hasQuota = storage.quota > 0;
  const usedPercent = hasQuota
    ? (storage.usedStorage / storage.quota) * 100
    : 0;
  const displayedPercent = Math.round(Math.min(100, usedPercent));
  const usedStorage = filesize(storage.usedStorage, { standard: 'jedec' });
  const quota = hasQuota
    ? filesize(storage.quota, { standard: 'jedec' })
    : t('unlimitedLabel');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          {t('modViewStorageTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Row label={t('modViewStorageUsed')} value={usedStorage} />
        <Row label={t('modViewStorageQuota')} value={quota} />
        <Row label={t('modViewStorageFiles')} value={storage.fileCount} />

        {hasQuota && (
          <div className="space-y-2 px-1 pt-1">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">{t('modViewStorageUsage')}</span>
              <span className="text-sm text-muted-foreground">
                {displayedPercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${displayedPercent}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { Storage };
