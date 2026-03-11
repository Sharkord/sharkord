import { ImageCropperDialog } from '@/components/image-cropper-dialog';
import { ImagePicker } from '@/components/image-picker';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const { t } = useTranslation('dialogs');
  const openFilePicker = useFilePicker();
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  const removeLogo = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.changeLogo.mutate({ fileId: undefined });
      await refetch();

      toast.success(t('logoRemovedSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('logoRemoveFailed'));
    }
  }, [refetch, t]);

  const onLogoClick = useCallback(async () => {
    try {
      const [file] = await openFilePicker('image/*');

      const reader = new FileReader();
      reader.onload = () => {
        setPendingImageSrc(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    } catch {
      // user cancelled
    }
  }, [openFilePicker]);

  const onCropConfirm = useCallback(
    async (croppedFile: File) => {
      const trpc = getTRPCClient();

      try {
        const temporaryFile = await uploadFile(croppedFile);

        if (!temporaryFile) {
          toast.error(t('uploadFailed'));
          return;
        }

        await trpc.others.changeLogo.mutate({ fileId: temporaryFile.id });
        await refetch();

        toast.success(t('logoUpdatedSuccess'));
      } catch {
        toast.error(t('logoUpdateFailed'));
      } finally {
        setPendingImageSrc(null);
      }
    },
    [refetch, t]
  );

  return (
    <>
      <Group
        label="Logo"
        description="Recommended max resolution: 1200x400 or 1024x1024."
      >
        <ImagePicker
          image={logo}
          onImageClick={onLogoClick}
          onRemoveImageClick={removeLogo}
          className="w-48 h-48"
        />
      </Group>

      {pendingImageSrc && (
        <ImageCropperDialog
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setPendingImageSrc(null);
          }}
          imageSrc={pendingImageSrc}
          aspect={1}
          cropShape="rect"
          title={t('cropLogoTitle')}
          onConfirm={onCropConfirm}
        />
      )}
    </>
  );
});

export { LogoManager };
