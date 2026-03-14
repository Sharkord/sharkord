import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminStorage } from '@/features/server/admin/hooks';
import {
  STORAGE_MAX_AVATAR_SIZE,
  STORAGE_MAX_BANNER_SIZE,
  STORAGE_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_QUOTA,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MAX_SIGNED_URLS_TTL_SECONDS,
  STORAGE_MIN_FILES_PER_MESSAGE,
  STORAGE_MIN_FILE_SIZE,
  STORAGE_MIN_QUOTA,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_MIN_SIGNED_URLS_TTL_SECONDS,
  StorageOverflowAction
} from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  LoadingCard,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Switch
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { DiskMetrics } from './metrics';
import {
  MAX_AVATAR_SIZE_PRESETS,
  MAX_BANNER_SIZE_PRESETS,
  MAX_FILES_PER_MESSAGE_PRESETS,
  MAX_FILE_SIZE_PRESETS,
  QUOTA_BY_USER_PRESETS,
  QUOTA_PRESETS,
  SIGNED_URLS_TTL_PRESETS
} from './presets';
import { StorageSizeControl } from './storage-size-control';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const Storage = memo(() => {
  const { t } = useTranslation('settings');
  const { values, loading, submit, onChange, labels, diskMetrics } =
    useAdminStorage();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('storageTitle')}</CardTitle>
        <CardDescription>{t('storageDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DiskMetrics diskMetrics={diskMetrics!} />

        <Group
          label={t('allowUploadsLabel')}
          description={t('allowUploadsDesc')}
        >
          <Switch
            checked={!!values.storageUploadEnabled}
            onCheckedChange={(checked) =>
              onChange('storageUploadEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('allowFileSharingInDMsLabel')}
          description={t('allowFileSharingInDMsDesc')}
        >
          <Switch
            checked={!!values.storageFileSharingInDirectMessages}
            onCheckedChange={(checked) =>
              onChange('storageFileSharingInDirectMessages', checked)
            }
            disabled={!values.storageUploadEnabled}
          />
        </Group>

        <Group
          label={t('quotaLabel')}
          description={t('quotaDesc')}
          help={t('quotaHelp')}
        >
          <StorageSizeControl
            value={Number(values.storageQuota)}
            max={STORAGE_MAX_QUOTA}
            min={STORAGE_MIN_QUOTA}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageQuota', value)}
            preview={
              <>
                {labels.storageQuota.value} {labels.storageQuota.unit}
              </>
            }
            presets={QUOTA_PRESETS}
          />
        </Group>

        <Group label={t('maxFileSizeLabel')} description={t('maxFileSizeDesc')}>
          <StorageSizeControl
            value={Number(values.storageUploadMaxFileSize)}
            max={STORAGE_MAX_FILE_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageUploadMaxFileSize', value)}
            preview={
              <>
                {labels.storageUploadMaxFileSize.value}{' '}
                {labels.storageUploadMaxFileSize.unit}
              </>
            }
            presets={MAX_FILE_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('maxAvatarSizeLabel')}
          description={t('maxAvatarSizeDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageMaxAvatarSize)}
            max={STORAGE_MAX_AVATAR_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageMaxAvatarSize', value)}
            preview={
              <>
                {labels.storageMaxAvatarSize.value}{' '}
                {labels.storageMaxAvatarSize.unit}
              </>
            }
            presets={MAX_AVATAR_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('maxBannerSizeLabel')}
          description={t('maxBannerSizeDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageMaxBannerSize)}
            max={STORAGE_MAX_BANNER_SIZE}
            min={STORAGE_MIN_FILE_SIZE}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageMaxBannerSize', value)}
            preview={
              <>
                {labels.storageMaxBannerSize.value}{' '}
                {labels.storageMaxBannerSize.unit}
              </>
            }
            presets={MAX_BANNER_SIZE_PRESETS}
          />
        </Group>

        <Group
          label={t('quotaPerUserLabel')}
          description={t('quotaPerUserDesc')}
        >
          <StorageSizeControl
            value={Number(values.storageSpaceQuotaByUser)}
            max={STORAGE_MAX_QUOTA_PER_USER}
            min={STORAGE_MIN_QUOTA_PER_USER}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageSpaceQuotaByUser', value)}
            preview={
              Number(values.storageSpaceQuotaByUser) === 0 ? (
                t('unlimitedLabel')
              ) : (
                <>
                  {labels.storageSpaceQuotaByUser.value}{' '}
                  {labels.storageSpaceQuotaByUser.unit}
                </>
              )
            }
            presets={QUOTA_BY_USER_PRESETS}
          />
        </Group>

        <Group
          label={t('maxFilesPerMessageLabel')}
          description={t('maxFilesPerMessageDesc')}
        >
          <div className="flex items-center max-w-150 justify-between">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="border-input bg-background text-foreground h-8 w-28 rounded-md border px-2 text-sm"
                min={STORAGE_MIN_FILES_PER_MESSAGE}
                max={STORAGE_MAX_FILES_PER_MESSAGE}
                step={1}
                value={Number(values.storageMaxFilesPerMessage)}
                disabled={!values.storageUploadEnabled}
                onChange={(e) => {
                  const nextValue = Number(e.target.value);

                  if (!Number.isFinite(nextValue)) {
                    return;
                  }

                  onChange(
                    'storageMaxFilesPerMessage',
                    clamp(
                      Math.round(nextValue),
                      STORAGE_MIN_FILES_PER_MESSAGE,
                      STORAGE_MAX_FILES_PER_MESSAGE
                    )
                  );
                }}
              />
              <span className="text-xs text-muted-foreground">
                {t('filesUnit')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {MAX_FILES_PER_MESSAGE_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="outline"
                  disabled={!values.storageUploadEnabled}
                  onClick={() =>
                    onChange('storageMaxFilesPerMessage', preset.value)
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </Group>

        <Group
          label={t('overflowActionLabel')}
          description={t('overflowActionDesc')}
        >
          <Select
            onValueChange={(value) =>
              onChange('storageOverflowAction', value as StorageOverflowAction)
            }
            value={values.storageOverflowAction}
            disabled={!values.storageUploadEnabled}
          >
            <SelectTrigger className="w-[230px]">
              <SelectValue placeholder={t('overflowActionPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={StorageOverflowAction.DELETE_OLD_FILES}>
                {t('overflowDeleteOldFiles')}
              </SelectItem>
              <SelectItem value={StorageOverflowAction.PREVENT_UPLOADS}>
                {t('overflowPreventUploads')}
              </SelectItem>
            </SelectContent>
          </Select>
        </Group>

        <Separator />

        <Group label={t('signedUrlsLabel')} description={t('signedUrlsDesc')}>
          <Switch
            checked={!!values.storageSignedUrlsEnabled}
            onCheckedChange={(checked) =>
              onChange('storageSignedUrlsEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('signedUrlsTtlLabel')}
          description={t('signedUrlsTtlDesc')}
        >
          <div className="flex items-center max-w-150 justify-between">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                className="border-input bg-background text-foreground h-8 w-28 rounded-md border px-2 text-sm"
                min={Math.ceil(STORAGE_MIN_SIGNED_URLS_TTL_SECONDS / 60)}
                max={Math.floor(STORAGE_MAX_SIGNED_URLS_TTL_SECONDS / 60)}
                step={1}
                value={Math.round(
                  Number(values.storageSignedUrlsTtlSeconds) / 60
                )}
                disabled={!values.storageSignedUrlsEnabled}
                onChange={(e) => {
                  const nextMinutes = Number(e.target.value);

                  if (!Number.isFinite(nextMinutes)) {
                    return;
                  }

                  const nextSeconds = clamp(
                    Math.round(nextMinutes) * 60,
                    STORAGE_MIN_SIGNED_URLS_TTL_SECONDS,
                    STORAGE_MAX_SIGNED_URLS_TTL_SECONDS
                  );

                  onChange('storageSignedUrlsTtlSeconds', nextSeconds);
                }}
              />
              <span className="text-xs text-muted-foreground">
                {t('signedUrlsTtlUnit')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {SIGNED_URLS_TTL_PRESETS.map((preset) => (
                <Button
                  key={preset.value}
                  size="sm"
                  variant="outline"
                  disabled={!values.storageSignedUrlsEnabled}
                  onClick={() =>
                    onChange('storageSignedUrlsTtlSeconds', preset.value)
                  }
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} disabled={loading}>
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Storage };
