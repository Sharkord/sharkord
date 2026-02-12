import { ImagePicker } from '@/components/image-picker';
import { Group } from '@/components/ui/group';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const { t } = useTranslation();
  const openFilePicker = useFilePicker();

  const removeLogo = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.changeLogo.mutate({ fileId: undefined });
      await refetch();

      toast.success(t('serverSettings.general.toasts.logoRemovedSuccess'));
    } catch (error) {
      console.error(error);
      toast.error(t('serverSettings.general.toasts.logoRemovedError'));
    }
  }, [refetch, t]);

  const onLogoClick = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error(t('serverSettings.general.toasts.logoUploadError'));
        return;
      }

      await trpc.others.changeLogo.mutate({ fileId: temporaryFile.id });
      await refetch();

      toast.success(t('serverSettings.general.toasts.logoUpdatedSuccess'));
    } catch {
      toast.error(t('serverSettings.general.toasts.logoUpdatedError'));
    }
  }, [openFilePicker, refetch, t]);

  return (
    <Group label={t('serverSettings.general.logoLabel')}>
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
