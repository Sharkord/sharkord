import { Button } from '@/components/ui/button';
import { Group } from '@/components/ui/group';
import { UserAvatar } from '@/components/user-avatar';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Upload } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TAvatarManagerProps = {
  user: TJoinedPublicUser;
};

const AvatarManager = memo(({ user }: TAvatarManagerProps) => {
  const { t } = useTranslation();
  const openFilePicker = useFilePicker();

  const removeAvatar = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.changeAvatar.mutate({ fileId: undefined });

      toast.success(t('userSettings.profile.avatar.toasts.removedSuccess'));
    } catch {
      toast.error(t('userSettings.profile.avatar.toasts.removedError'));
    }
  }, [t]);

  const onAvatarClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error(t('userSettings.profile.avatar.toasts.uploadError'));
        return;
      }

      await trpc.users.changeAvatar.mutate({ fileId: temporaryFile.id });

      toast.success(t('userSettings.profile.avatar.toasts.updatedSuccess'));
    } catch {
      toast.error(t('userSettings.profile.avatar.toasts.updatedError'));
    }
  }, [openFilePicker, t]);

  return (
    <Group label={t('userSettings.profile.avatar.label')}>
      <div className="space-y-2">
        <div
          className="relative group cursor-pointer w-32 h-32"
          onClick={onAvatarClick}
        >
          <UserAvatar
            userId={user.id}
            className="h-32 w-32 rounded-full bg-muted transition-opacity group-hover:opacity-30"
            showStatusBadge={false}
            showUserPopover={false}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
            <div className="bg-black/50 rounded-full p-3">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      {user.avatarId && (
        <div>
          <Button size="sm" variant="outline" onClick={removeAvatar}>
            {t('userSettings.profile.avatar.removeButton')}
          </Button>
        </div>
      )}
    </Group>
  );
});

export { AvatarManager };
