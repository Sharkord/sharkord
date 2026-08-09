import { uploadImage } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TImageKind = 'avatar' | 'banner' | 'logo';

const MESSAGES = {
  avatar: {
    updated: 'avatarUpdated',
    removed: 'avatarRemoved',
    failedUpdate: 'failedUpdateAvatar',
    failedRemove: 'failedRemoveAvatar'
  },
  banner: {
    updated: 'bannerUpdated',
    removed: 'bannerRemoved',
    failedUpdate: 'failedUpdateBanner',
    failedRemove: 'failedRemoveBanner'
  },
  logo: {
    updated: 'logoUpdated',
    removed: 'logoRemoved',
    failedUpdate: 'failedUpdateLogo',
    failedRemove: 'failedRemoveLogo'
  }
} as const;

const useImageManager = (kind: TImageKind, onChanged?: () => Promise<void>) => {
  const { t } = useTranslation('common');
  const openFilePicker = useFilePicker();

  const change = useCallback(
    async (fileId: string | undefined) => {
      const trpc = getTRPCClient();

      if (kind === 'logo') {
        await trpc.others.changeLogo.mutate({ fileId });
      } else if (kind === 'avatar') {
        await trpc.users.changeAvatar.mutate({ fileId });
      } else {
        await trpc.users.changeBanner.mutate({ fileId });
      }

      await onChanged?.();
    },
    [kind, onChanged]
  );

  const onRemove = useCallback(async () => {
    try {
      await change(undefined);

      toast.success(t(MESSAGES[kind].removed));
    } catch (error) {
      toast.error(getTrpcError(error, t(MESSAGES[kind].failedRemove)));
    }
  }, [change, kind, t]);

  const onPick = useCallback(async () => {
    try {
      const [file] = await openFilePicker('image/*');
      const temporaryFile = await uploadImage(file);

      if (!temporaryFile) return;

      await change(temporaryFile.id);

      toast.success(t(MESSAGES[kind].updated));
    } catch (error) {
      toast.error(getTrpcError(error, t(MESSAGES[kind].failedUpdate)));
    }
  }, [change, kind, openFilePicker, t]);

  return { onPick, onRemove };
};

export { useImageManager, type TImageKind };
