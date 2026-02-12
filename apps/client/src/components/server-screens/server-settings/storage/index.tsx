import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { LoadingCard } from '@/components/ui/loading-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminStorage } from '@/features/server/admin/hooks';
import {
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_QUOTA,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_FILE_SIZE,
  STORAGE_MIN_QUOTA,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTIONS_DICT,
  StorageOverflowAction
} from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DiskMetrics } from './metrics';

const FILE_SIZE_STEP = 5 * 1024 * 1024; // 5MB

const Storage = memo(() => {
  const { t } = useTranslation();
  const { values, loading, submit, onChange, labels, diskMetrics } =
    useAdminStorage();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('serverSettings.storage.title')}</CardTitle>
        <CardDescription>
          {t('serverSettings.storage.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DiskMetrics diskMetrics={diskMetrics!} />

        <Group
          label={t('serverSettings.storage.allowUploadsLabel')}
          description={t('serverSettings.storage.allowUploadsDescription')}
        >
          <Switch
            checked={!!values.storageUploadEnabled}
            onCheckedChange={(checked) =>
              onChange('storageUploadEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('serverSettings.storage.quotaLabel')}
          description={t('serverSettings.storage.quotaDescription')}
          help={t('serverSettings.storage.quotaHelp')}
        >
          <Slider
            className="w-96"
            value={[Number(values.storageQuota)]}
            max={STORAGE_MAX_QUOTA}
            min={STORAGE_MIN_QUOTA}
            step={FILE_SIZE_STEP}
            disabled={!values.storageUploadEnabled}
            onValueChange={(values) => onChange('storageQuota', values[0])}
            rightSlot={
              <span className="text-sm">
                {labels.storageQuota.value} {labels.storageQuota.unit}
              </span>
            }
          />
        </Group>

        <Group
          label={t('serverSettings.storage.maxFileSizeLabel')}
          description={t('serverSettings.storage.maxFileSizeDescription')}
        >
          <Slider
            className="w-96"
            value={[Number(values.storageUploadMaxFileSize)]}
            max={STORAGE_MAX_FILE_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            step={FILE_SIZE_STEP}
            disabled={!values.storageUploadEnabled}
            onValueChange={(values) =>
              onChange('storageUploadMaxFileSize', values[0])
            }
            rightSlot={
              <span className="text-sm">
                {labels.storageUploadMaxFileSize.value}{' '}
                {labels.storageUploadMaxFileSize.unit}
              </span>
            }
          />
        </Group>

        <Group
          label={t('serverSettings.storage.quotaPerUserLabel')}
          description={t('serverSettings.storage.quotaPerUserDescription')}
        >
          <Slider
            className="w-96"
            value={[values.storageSpaceQuotaByUser]}
            max={STORAGE_MAX_QUOTA_PER_USER}
            min={STORAGE_MIN_QUOTA_PER_USER}
            step={FILE_SIZE_STEP}
            disabled={!values.storageUploadEnabled}
            onValueChange={(values) =>
              onChange('storageSpaceQuotaByUser', values[0])
            }
            rightSlot={
              <span className="text-sm">
                {labels.storageSpaceQuotaByUser.value}{' '}
                {labels.storageSpaceQuotaByUser.unit}
              </span>
            }
          />
        </Group>

        <Group
          label={t('serverSettings.storage.overflowActionLabel')}
          description={t('serverSettings.storage.overflowActionDescription')}
        >
          <Select
            onValueChange={(value) =>
              onChange('storageOverflowAction', value as StorageOverflowAction)
            }
            value={values.storageOverflowAction}
            disabled={!values.storageUploadEnabled}
          >
            <SelectTrigger className="w-[230px]">
              <SelectValue
                placeholder={t('serverSettings.storage.overflowActionPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(StorageOverflowAction).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {STORAGE_OVERFLOW_ACTIONS_DICT[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('serverSettings.actions.cancel')}
          </Button>
          <Button onClick={submit} disabled={loading}>
            {t('serverSettings.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Storage };
