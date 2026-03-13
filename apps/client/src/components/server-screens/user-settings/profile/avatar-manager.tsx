import { Dialog } from '@/components/dialogs/dialogs';
import { UserAvatar } from '@/components/user-avatar';
import { openDialog } from '@/features/dialogs/actions';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError, type TJoinedPublicUser } from '@sharkord/shared';
import { Button, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TAvatarManagerProps = {
  user: TJoinedPublicUser;
};

const AvatarManager = memo(({ user }: TAvatarManagerProps) => {
  const { t } = useTranslation('dialogs');
  const openFilePicker = useFilePicker();

  const removeAvatar = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.changeAvatar.mutate({ fileId: undefined });

      toast.success(t('avatarRemovedSuccess'));
    } catch (error) {
      toast.error(getTrpcError(error, t('avatarRemoveFailed')));
    }
  }, [t]);

  const onCropConfirm = useCallback(
    async (croppedFile: File) => {
      const trpc = getTRPCClient();

      try {
        const temporaryFile = await uploadFile(croppedFile);

        if (!temporaryFile) {
          toast.error(t('uploadFailed'));
          return;
        }

        await trpc.users.changeAvatar.mutate({ fileId: temporaryFile.id });

        toast.success(t('avatarUpdatedSuccess'));
      } catch (error) {
        toast.error(getTrpcError(error, t('avatarUpdateFailed')));
      }
    },
    [t]
  );

  const onAvatarClick = useCallback(async () => {
    try {
      const [file] = await openFilePicker('image/*');

      const reader = new FileReader();
      reader.onload = () => {
        openDialog(Dialog.IMAGE_CROPPER, {
          imageSrc: reader.result as string,
          originalFileName: file.name,
          aspect: 1,
          cropShape: 'round',
          title: t('cropAvatarTitle'),
          onConfirm: onCropConfirm
        });
      };
      reader.readAsDataURL(file);
    } catch {
      // user cancelled
    }
  }, [openFilePicker, onCropConfirm, t]);

  return (
    <Group label={t('avatarLabel')}>
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
            {t('removeAvatar')}
          </Button>
        </div>
      )}
    </Group>
  );
});

export { AvatarManager };
