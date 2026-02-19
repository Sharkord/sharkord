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
import { DiskMetrics } from './metrics';

const FILE_SIZE_STEP = 5 * 1024 * 1024; // 5MB

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
          label="Quota"
          description="The total amount of storage space allocated to the server."
          help="This is not a hard limit, meaning that files will still be written to disk temporarily even if the quota is exceeded. The overflow action will be applied after the upload is complete. Make sure you have more disk space available than the quota you set here."
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
          label="Max file size"
          description="The maximum size of a single file that can be uploaded to the server."
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
          label="Quota per user"
          description="The maximum amount of storage space each user can use on the server. You can also configure quotas on a per-role basis in the Roles settings, which will override this global setting for users with that specific role. Use 0 for unlimited"
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
