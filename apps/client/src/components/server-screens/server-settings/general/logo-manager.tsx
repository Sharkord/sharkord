import { Dialog } from '@/components/dialogs/dialogs';
import { ImagePicker } from '@/components/image-picker';
import { openDialog } from '@/features/dialogs/actions';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const { t } = useTranslation('dialogs');
  const openFilePicker = useFilePicker();

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
      }
    },
    [refetch, t]
  );

  const onLogoClick = useCallback(async () => {
    try {
      const [file] = await openFilePicker('image/*');

      const reader = new FileReader();
      reader.onload = () => {
        openDialog(Dialog.IMAGE_CROPPER, {
          imageSrc: reader.result as string,
          originalFileName: file.name,
          aspect: 1,
          cropShape: 'rect',
          title: t('cropLogoTitle'),
          onConfirm: onCropConfirm
        });
      };
      reader.readAsDataURL(file);
    } catch {
      // user cancelled
    }
  }, [openFilePicker, onCropConfirm, t]);

  return (
    <Group label={t('logoLabel')} description={t('logoRecommendedResolution')}>
      <ImagePicker
        image={logo}
        onImageClick={onLogoClick}
        onRemoveImageClick={removeLogo}
        className="w-48 h-48"
      />
    </Group>
  );
});

export { LogoManager };
