import { useServerName } from '@/features/server/hooks';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { getInitialsFromName } from '@/helpers/get-initials-from-name';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { AvatarImage } from '@radix-ui/react-avatar';
import { getTrpcError } from '@sharkord/shared';
import {
  Avatar,
  AvatarFallback,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  IconButton,
  Input,
  Textarea
} from '@sharkord/ui';
import { Upload, X } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TWelcomeProfileSetupDialogProps = TDialogBaseProps;

const WelcomeProfileSetupDialog = memo(
  ({ isOpen, close }: TWelcomeProfileSetupDialogProps) => {
    const { t } = useTranslation('dialogs');
    const serverName = useServerName();
    const ownPublicUser = useOwnPublicUser();
    const openFilePicker = useFilePicker();
    const [loading, setLoading] = useState(false);
    const { r, values, setTrpcErrors } = useForm({
      name: ownPublicUser?.name ?? '',
      bio: ownPublicUser?.bio ?? ''
    });

    const onAvatarClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const [file] = await openFilePicker('image/*');

        const temporaryFile = await uploadFile(file);

        if (!temporaryFile) {
          toast.error(t('welcomeUploadError'));
          return;
        }

        await trpc.users.changeAvatar.mutate({ fileId: temporaryFile.id });
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeUpdateAvatarError')));
      }
    }, [openFilePicker, t]);

    const onAvatarRemove = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.users.changeAvatar.mutate({});
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeRemoveAvatarError')));
      }
    }, [t]);

    const onBannerClick = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        const [file] = await openFilePicker('image/*');

        const temporaryFile = await uploadFile(file);

        if (!temporaryFile) {
          toast.error(t('welcomeUploadError'));
          return;
        }

        await trpc.users.changeBanner.mutate({ fileId: temporaryFile.id });
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeUpdateBannerError')));
      }
    }, [openFilePicker, t]);

    const onBannerRemove = useCallback(async () => {
      const trpc = getTRPCClient();

      try {
        await trpc.users.changeBanner.mutate({});
      } catch (error) {
        toast.error(getTrpcError(error, t('welcomeRemoveBannerError')));
      }
    }, [t]);

    const onSave = useCallback(async () => {
      if (!ownPublicUser) return;

      const trpc = getTRPCClient();
      const trimmedBio = values.bio.trim();

      setLoading(true);

      try {
        await trpc.users.update.mutate({
          name: values.name.trim(),
          bannerColor: ownPublicUser.bannerColor ?? '#FFFFFF',
          bio: trimmedBio || undefined
        });

        toast.success(t('welcomeProfileSaved'));
        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [close, ownPublicUser, setTrpcErrors, t, values.bio, values.name]);

    if (!ownPublicUser) return null;

    const previewName = values.name.trim() || ownPublicUser.name;

    return (
      <Dialog open={isOpen}>
        <DialogContent close={close} className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t('welcomeProfileSetupTitle', {
                serverName: serverName ?? 'Sharkord'
              })}
            </DialogTitle>
            <DialogDescription>
              {t('welcomeProfileSetupDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md border border-border overflow-hidden bg-card">
            <div className="relative">
              <button
                type="button"
                className="relative group cursor-pointer w-full h-28 block"
                onClick={onBannerClick}
              >
                {ownPublicUser.banner ? (
                  <img
                    src={getFileUrl(ownPublicUser.banner)}
                    alt="User banner"
                    className="w-full h-28 object-cover transition-opacity group-hover:opacity-70"
                  />
                ) : (
                  <div
                    className="w-full h-28 border-b border-border transition-opacity group-hover:opacity-70"
                    style={{
                      background: ownPublicUser.bannerColor || '#5865f2'
                    }}
                  />
                )}

                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/50 rounded-full p-2">
                    <Upload className="h-5 w-5 text-white" />
                  </div>
                </div>

                {ownPublicUser.banner && (
                  <IconButton
                    icon={X}
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onBannerRemove();
                    }}
                  />
                )}
              </button>

              <div className="absolute left-4 top-20">
                <button
                  type="button"
                  className="relative group cursor-pointer w-20 h-20"
                  onClick={onAvatarClick}
                >
                  <Avatar className="h-20 w-20 rounded-full bg-muted border-4 border-card transition-opacity group-hover:opacity-40">
                    <AvatarImage
                      src={getFileUrl(ownPublicUser.avatar)}
                      key={ownPublicUser.avatarId}
                    />
                    <AvatarFallback className="text-base">
                      {getInitialsFromName(previewName)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                    <div className="bg-black/50 rounded-full p-2">
                      <Upload className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {ownPublicUser.avatar && (
                    <IconButton
                      icon={X}
                      size="sm"
                      className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAvatarRemove();
                      }}
                    />
                  )}
                </button>
              </div>
            </div>

            <div className="px-4 pt-14 pb-4 space-y-3">
              <Input
                {...r('name')}
                className="text-base font-semibold"
                placeholder={t('welcomeUsernamePlaceholder')}
              />

              <Textarea
                {...r('bio')}
                placeholder={t('welcomeBioPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={close}>
              {t('welcomeSkipBtn')}
            </Button>
            <Button
              onClick={onSave}
              disabled={loading || !values.name.trim().length}
            >
              {t('welcomeSaveBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { WelcomeProfileSetupDialog };
