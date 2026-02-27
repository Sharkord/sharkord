import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminStorage } from '@/features/server/admin/hooks';
import {
  STORAGE_MAX_AVATAR_SIZE,
  STORAGE_MAX_BANNER_SIZE,
  STORAGE_MAX_FILES_PER_MESSAGE,
  STORAGE_MAX_FILE_SIZE,
  STORAGE_MAX_QUOTA,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_FILES_PER_MESSAGE,
  STORAGE_MIN_FILE_SIZE,
  STORAGE_MIN_QUOTA,
  STORAGE_MIN_QUOTA_PER_USER,
  STORAGE_OVERFLOW_ACTIONS_DICT,
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
  Switch
} from '@sharkord/ui';
import { memo } from 'react';
import { DiskMetrics } from './metrics';
import {
  MAX_AVATAR_SIZE_PRESETS,
  MAX_BANNER_SIZE_PRESETS,
  MAX_FILES_PER_MESSAGE_PRESETS,
  MAX_FILE_SIZE_PRESETS,
  QUOTA_BY_USER_PRESETS,
  QUOTA_PRESETS
} from './presets';
import { StorageSizeControl } from './storage-size-control';

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

const Storage = memo(() => {
  const { values, loading, submit, onChange, labels, diskMetrics } =
    useAdminStorage();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Storage</CardTitle>
        <CardDescription>
          Manage your server's storage settings. Control how data is stored,
          accessed, and managed. Here you can configure storage limits, backup
          options, and data retention policies to ensure optimal performance and
          reliability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DiskMetrics diskMetrics={diskMetrics!} />

        <Group
          label="Allow uploads"
          description="Allows users to upload files to the server. Existing files won't be affected."
        >
          <Switch
            checked={!!values.storageUploadEnabled}
            onCheckedChange={(checked) =>
              onChange('storageUploadEnabled', checked)
            }
          />
        </Group>

        <Group
          label="Allow file sharing in direct messages"
          description="Controls whether users can attach files in DMs."
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
          label="Quota"
          description="The total amount of storage space allocated to the server."
          help="This is not a hard limit, meaning that files will still be written to disk temporarily even if the quota is exceeded. The overflow action will be applied after the upload is complete. Make sure you have more disk space available than the quota you set here."
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

        <Group
          label="Max file size"
          description="The maximum size of a single file that can be uploaded to the server."
        >
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
          label="Max avatar size"
          description="The maximum avatar file size users are allowed to set on their profile."
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
          label="Max banner size"
          description="The maximum profile banner file size users are allowed to set."
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
          label="Quota per user"
          description="The maximum amount of storage space each user can use on the server. You can also configure quotas on a per-role basis in the Roles settings, which will override this global setting for users with that specific role. Use 0 for unlimited"
        >
          <StorageSizeControl
            value={Number(values.storageSpaceQuotaByUser)}
            max={STORAGE_MAX_QUOTA_PER_USER}
            min={STORAGE_MIN_QUOTA_PER_USER}
            disabled={!values.storageUploadEnabled}
            onChange={(value) => onChange('storageSpaceQuotaByUser', value)}
            preview={
              Number(values.storageSpaceQuotaByUser) === 0 ? (
                'Unlimited'
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
          label="Max files per message"
          description="Maximum number of attachments allowed on a single message. Extra files are ignored."
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
              <span className="text-xs text-muted-foreground">files</span>
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
          label="Overflow action"
          description="Action to take when the global storage quota is exceeded."
        >
          <Select
            onValueChange={(value) =>
              onChange('storageOverflowAction', value as StorageOverflowAction)
            }
            value={values.storageOverflowAction}
            disabled={!values.storageUploadEnabled}
          >
            <SelectTrigger className="w-[230px]">
              <SelectValue placeholder="Select the polling interval" />
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
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Storage };
